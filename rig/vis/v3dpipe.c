// v3dpipe.c — the whole box-renders-and-streams chain, honestly timed.
// Renders the generative post-processing shader headless on V3D, reads the
// pixels back, writes raw RGBA to stdout. Pipe it into ffmpeg.
//   ./v3dpipe W H FRAMES [PASSES] > /dev/null      (or | ffmpeg ...)
// Reports to STDERR: wall clock, achieved fps, and its own CPU time split.
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <time.h>
#include <sys/resource.h>
#include <gbm.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES3/gl31.h>

static double now_ms(void){ struct timespec t; clock_gettime(CLOCK_MONOTONIC,&t);
  return t.tv_sec*1000.0+t.tv_nsec/1e6; }

static const char *VS =
  "#version 310 es\n"
  "void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2);\n"
  "  gl_Position=vec4(p*2.0-1.0,0.0,1.0); }\n";
static const char *FS_KAL =
  "#version 310 es\n"
  "precision highp float;\n"
  "uniform float uT; uniform vec2 uRes; uniform sampler2D uPrev;\n"
  "uniform float uSeg; uniform float uFb; uniform float uScale; uniform float uWarp; uniform float uHue;\n"
  "out vec4 o;\n"
  "float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n"
  "float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);\n"
  "  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }\n"
  "void main(){\n"
  "  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;\n"
  "  float a=atan(uv.y,uv.x), r=length(uv), seg=6.2831853/uSeg;\n"
  "  a=abs(mod(a+0.5*seg,seg)-0.5*seg);\n"
  "  vec2 k=vec2(cos(a),sin(a))*r;\n"
  "  float w=n(k*uScale+uT*0.3)+0.5*n(k*uScale*2.0-uT*0.2)+0.25*n(k*uScale*4.0+uT*0.5);\n"
  "  vec2 dd=k+uWarp*vec2(cos(w*6.2831),sin(w*6.2831));\n"
  "  vec3 c=0.5+0.5*cos(6.2831*(w+vec3(0.0,0.33,0.67)*uHue)+uT);\n"
  "  vec3 fb=texture(uPrev,dd*0.9+0.5).rgb;\n"
  "  o=vec4(mix(c,fb,uFb),1.0); }\n";
static const char *FS_BLUR =
  "#version 310 es\n"
  "precision highp float;\n"
  "uniform vec2 uRes; uniform sampler2D uPrev;\n"
  "out vec4 o;\n"
  "void main(){ vec2 t=1.0/uRes, uv=gl_FragCoord.xy*t; vec3 s=vec3(0.0);\n"
  "  s+=texture(uPrev,uv+vec2(-1,-1)*t).rgb; s+=texture(uPrev,uv+vec2(0,-1)*t).rgb*2.0;\n"
  "  s+=texture(uPrev,uv+vec2(1,-1)*t).rgb; s+=texture(uPrev,uv+vec2(-1,0)*t).rgb*2.0;\n"
  "  s+=texture(uPrev,uv).rgb*4.0; s+=texture(uPrev,uv+vec2(1,0)*t).rgb*2.0;\n"
  "  s+=texture(uPrev,uv+vec2(-1,1)*t).rgb; s+=texture(uPrev,uv+vec2(0,1)*t).rgb*2.0;\n"
  "  s+=texture(uPrev,uv+vec2(1,1)*t).rgb; o=vec4(s/16.0,1.0); }\n";

// ⚠️ TWO FLAVOURS, AND THE DIFFERENCE IS WHETHER A BAD SHADER IS FATAL. At
// startup it is: nothing is running yet and a build that cannot draw should say
// so and stop. At RUNTIME it must not be — a shader arriving over the socket is
// somebody typing, and a typo must never take down a picture that is being
// watched, on a board whose recovery story is a reboot.
static GLuint mkprog_try(const char*fs){
  GLuint v=glCreateShader(GL_VERTEX_SHADER),f=glCreateShader(GL_FRAGMENT_SHADER);
  glShaderSource(v,1,&VS,NULL); glCompileShader(v);
  glShaderSource(f,1,&fs,NULL); glCompileShader(f);
  GLint cok=0; glGetShaderiv(f,GL_COMPILE_STATUS,&cok);
  if(!cok){ char l[2048]; glGetShaderInfoLog(f,sizeof l,NULL,l); fprintf(stderr,"SHADER-REFUSED compile: %s\n",l);
            glDeleteShader(v); glDeleteShader(f); return 0; }
  GLuint p=glCreateProgram(); glAttachShader(p,v); glAttachShader(p,f); glLinkProgram(p);
  GLint ok=0; glGetProgramiv(p,GL_LINK_STATUS,&ok);
  glDeleteShader(v); glDeleteShader(f);
  if(!ok){ char l[2048]; glGetProgramInfoLog(p,sizeof l,NULL,l); fprintf(stderr,"SHADER-REFUSED link: %s\n",l);
           glDeleteProgram(p); return 0; }
  return p;
}
static GLuint mkprog(const char*fs){
  GLuint p = mkprog_try(fs);
  if(!p){ fprintf(stderr,"link failed at startup\n"); exit(2); }
  return p;
}

/* base64, because a GLSL body has newlines and the control channel is one
   command per line. 30 lines here against inventing an escaping scheme. */
static int b64dec(const char*in, char*out, int cap){
  static const char*T="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  int val=0, bits=-8, n=0;
  for(const char*p=in; *p && *p!='='; p++){
    const char*q=strchr(T,*p); if(!q) continue;
    val=(val<<6)|(int)(q-T); bits+=6;
    if(bits>=0){ if(n>=cap-1) return -1; out[n++]=(char)((val>>bits)&0xFF); bits-=8; }
  }
  out[n]=0; return n;
}
static void mktarget(int w,int h,GLuint*t,GLuint*f){
  glGenTextures(1,t); glBindTexture(GL_TEXTURE_2D,*t);
  glTexStorage2D(GL_TEXTURE_2D,1,GL_RGBA8,w,h);
  glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_MIRRORED_REPEAT);
  glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_MIRRORED_REPEAT);
  glGenFramebuffers(1,f); glBindFramebuffer(GL_FRAMEBUFFER,*f);
  glFramebufferTexture2D(GL_FRAMEBUFFER,GL_COLOR_ATTACHMENT0,GL_TEXTURE_2D,*t,0);
}

// ⚠️ THE CONTROL CHANNEL IS STDIN, WHICH WAS FREE. stdout carries the pixels
// and stderr carries the timings, so parameters had nowhere to arrive — and the
// alternative, restarting the process with new argv, costs seconds and cycles
// the exclusive hardware encoder, which is the thing that wedged the board
// once already. One line per change: `seg 16\n`, `fb 0.85\n`.
//
// NON-BLOCKING, because this is read in the render loop: a blocking read with
// nobody typing would stop the picture dead.
static float g_seg = 8.0f, g_fb = 0.78f, g_scale = 4.0f, g_warp = 0.08f, g_hue = 1.0f;
/* A shader that arrived over the wire, waiting for the render loop to take it.
   ⚠️ COMPILED ON THE RENDER THREAD, NOT HERE. drain_stdin runs inside the loop
   on this program, but GL calls belong where the context is current and keeping
   that rule explicit is cheaper than remembering it. */
static char  g_pending[16384];
static int   g_pending_n = 0;
/* The uniforms every pass wants, set defensively: a shader that arrived over
   the wire need not declare all of them, and `glGetUniformLocation` returning
   -1 for one it dropped is the normal case rather than an error. */
static void draw_pass(GLuint prog, long i, int W, int H, GLuint src,
                      float seg, float fb, float scale, float warp, float hue){
  glUseProgram(prog);
  GLint l;
  if((l=glGetUniformLocation(prog,"uT"))>=0) glUniform1f(l,(float)(i/30.0));
  if((l=glGetUniformLocation(prog,"uRes"))>=0) glUniform2f(l,(float)W,(float)H);
  if((l=glGetUniformLocation(prog,"uSeg"))>=0) glUniform1f(l,seg);
  if((l=glGetUniformLocation(prog,"uFb"))>=0) glUniform1f(l,fb);
  if((l=glGetUniformLocation(prog,"uScale"))>=0) glUniform1f(l,scale);
  if((l=glGetUniformLocation(prog,"uWarp"))>=0) glUniform1f(l,warp);
  if((l=glGetUniformLocation(prog,"uHue"))>=0) glUniform1f(l,hue);
  if((l=glGetUniformLocation(prog,"uPrev"))>=0){
    glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D,src); glUniform1i(l,0); }
  glDrawArrays(GL_TRIANGLES,0,3);
}

static void drain_stdin(void){
  /* 16 KiB: a base64 GLSL body is ~1.6 KiB today and the old 256-byte line
     would have silently truncated it into a syntax error. */
  static char line[16384]; static int len = 0;
  char c;
  while(read(0, &c, 1) == 1){
    if(c != '\n'){ if(len < (int)sizeof(line)-1) line[len++] = c; continue; }
    line[len] = 0; len = 0;
    if(!strncmp(line, "shader ", 7)){
      int n = b64dec(line+7, g_pending, sizeof g_pending);
      if(n > 0){ g_pending_n = n; fprintf(stderr, "SHADER-QUEUED %d bytes\n", n); }
      else { g_pending_n = 0; fprintf(stderr, "SHADER-REFUSED base64\n"); }
      continue;
    }
    char k[32]; float v;
    if(sscanf(line, "%31s %f", k, &v) == 2){
      if(!strcmp(k,"seg")) g_seg = v < 2.0f ? 2.0f : (v > 64.0f ? 64.0f : v);
      else if(!strcmp(k,"fb")) g_fb = v < 0.0f ? 0.0f : (v > 0.95f ? 0.95f : v);
      else if(!strcmp(k,"scale")) g_scale = v < 0.5f ? 0.5f : (v > 40.0f ? 40.0f : v);
      else if(!strcmp(k,"warp")) g_warp = v < 0.0f ? 0.0f : (v > 1.2f ? 1.2f : v);
      else if(!strcmp(k,"hue")) g_hue = v < 0.0f ? 0.0f : (v > 3.0f ? 3.0f : v);
    }
  }
}

int main(int argc,char**argv){
  int W=argc>1?atoi(argv[1]):1280, H=argc>2?atoi(argv[2]):720;
  int N=argc>3?atoi(argv[3]):150, PASSES=argc>4?atoi(argv[4]):1;
  fcntl(0, F_SETFL, fcntl(0, F_GETFL, 0) | O_NONBLOCK);
  int fd=open("/dev/dri/renderD128",O_RDWR|O_CLOEXEC);
  struct gbm_device*g=gbm_create_device(fd);
  PFNEGLGETPLATFORMDISPLAYEXTPROC gpd=(PFNEGLGETPLATFORMDISPLAYEXTPROC)eglGetProcAddress("eglGetPlatformDisplayEXT");
  EGLDisplay d=gpd(EGL_PLATFORM_GBM_KHR,g,NULL);
  EGLint a,b; eglInitialize(d,&a,&b); eglBindAPI(EGL_OPENGL_ES_API);
  EGLint ca[]={EGL_CONTEXT_MAJOR_VERSION,3,EGL_CONTEXT_MINOR_VERSION,1,EGL_NONE};
  EGLContext c=eglCreateContext(d,EGL_NO_CONFIG_KHR,EGL_NO_CONTEXT,ca);
  eglMakeCurrent(d,EGL_NO_SURFACE,EGL_NO_SURFACE,c);
  fprintf(stderr,"renderer %s  %dx%d  %d passes  %d frames\n",
          glGetString(GL_RENDERER),W,H,PASSES,N);
  GLuint vao; glGenVertexArrays(1,&vao); glBindVertexArray(vao);
  GLuint tA,fA,tB,fB; mktarget(W,H,&tA,&fA); mktarget(W,H,&tB,&fB);
  GLuint pK=mkprog(FS_KAL), pB=mkprog(FS_BLUR);
  GLuint pKnew = 0; double fadeT0 = 0;
  glDisable(GL_DEPTH_TEST); glDisable(GL_BLEND); glViewport(0,0,W,H);
  unsigned char*buf=malloc((size_t)W*H*4);

  // N <= 0 MEANS FOREVER, for the streaming case.
  // Without it `video.start` asked for 0 frames, the renderer rendered none and
  // exited 0, and everything downstream stayed up: ffmpeg waited on a pipe that
  // would never carry anything and the socket joined an empty room. The only
  // thing that said so was the exit watcher. A bench wants a frame count; a
  // picture that somebody is watching does not have one.
  int forever = (N<=0);
  double t0=now_ms(), tRender=0, tRead=0, tWrite=0;
  long done_frames=0;
  GLuint src=tA,srct=tB,dst=fB,dst2=fA;
  for(long i=0; forever || i<N; i++){
    drain_stdin();
    double a0=now_ms();
    /* A shader that arrived since the last frame. Compiled HERE, where the
       context is current, and taken only if it compiles — the running picture
       is never put at risk by something somebody just typed. */
    if(g_pending_n){
      static char full[16512];
      snprintf(full, sizeof full, "#version 310 es\n%s", g_pending);
      g_pending_n = 0;
      GLuint np = mkprog_try(full);
      if(np){
        if(pKnew) glDeleteProgram(pKnew);
        pKnew = np; fadeT0 = now_ms();
        fprintf(stderr, "SHADER-OK fading in\n");
      }
    }

    for(int p=0;p<PASSES;p++){
      GLuint prog=p?pB:pK;
      glBindFramebuffer(GL_FRAMEBUFFER,dst);
      draw_pass(prog, i, W, H, src, g_seg, g_fb, g_scale, g_warp, g_hue);
      /* ⚠️ THE CROSSFADE IS CONSTANT-ALPHA BLENDING, NOT A MIX SHADER AND NOT
         EXTRA TARGETS. The old picture is already in the framebuffer, so
         drawing the new one over it with GL_CONSTANT_ALPHA gives
         new*k + old*(1-k) for free — no third program, no extra memory on a
         board that has little, and nothing to keep in step. */
      if(p==0 && pKnew){
        double k = (now_ms() - fadeT0) / 900.0;
        if(k > 1.0) k = 1.0;
        float kk = (float)(k*k*(3.0-2.0*k));               /* ease, as elsewhere */
        glEnable(GL_BLEND);
        glBlendColor(0.f,0.f,0.f,kk);
        glBlendFunc(GL_CONSTANT_ALPHA, GL_ONE_MINUS_CONSTANT_ALPHA);
        draw_pass(pKnew, i, W, H, src, g_seg, g_fb, g_scale, g_warp, g_hue);
        glDisable(GL_BLEND);
        if(k >= 1.0){ glDeleteProgram(pK); pK = pKnew; pKnew = 0;
                      fprintf(stderr, "SHADER-LIVE the new look is the look\n"); }
      }
      GLuint tt=src; src=srct; srct=tt;
      GLuint tf=dst; dst=dst2; dst2=tf;
    }
    glFinish(); double a1=now_ms();
    glBindFramebuffer(GL_FRAMEBUFFER,dst2);
    glReadPixels(0,0,W,H,GL_RGBA,GL_UNSIGNED_BYTE,buf);
    double a2=now_ms();
    size_t want=(size_t)W*H*4, done=0;
    while(done<want){ ssize_t k=write(1,buf+done,want-done); if(k<=0) break; done+=k; }
    double a3=now_ms();
    tRender+=a1-a0; tRead+=a2-a1; tWrite+=a3-a2;
    done_frames++;
    // ⚠️ A SHORT WRITE MEANS THE CONSUMER WENT AWAY. `done<want` above breaks
    // the inner loop and used to fall straight into the next frame, so a dead
    // encoder left this spinning at full GPU load with nowhere to put the
    // pixels. Stop instead, and let the caller's exit watcher report it.
    if(done<want){ fprintf(stderr,"downstream closed after %ld frames\n",done_frames); break; }
    // Report periodically when there is no end to report at: a stream nobody
    // can see the rate of is a stream nobody can tell has slowed down.
    if(forever && (done_frames % 300)==0){
      double e=now_ms()-t0;
      fprintf(stderr,"%ld frames, %.1f fps | render %.2f ms readback %.2f ms write %.2f ms\n",
              done_frames, done_frames*1000.0/e, tRender/done_frames, tRead/done_frames, tWrite/done_frames);
    }
  }
  N = (int)done_frames;
  if(N<1) N=1;                       // the report below divides by it
  double el=now_ms()-t0;
  struct rusage ru; getrusage(RUSAGE_SELF,&ru);
  double cpu=ru.ru_utime.tv_sec+ru.ru_utime.tv_usec/1e6
            +ru.ru_stime.tv_sec+ru.ru_stime.tv_usec/1e6;
  fprintf(stderr,
    "%d frames in %.2fs = %.1f fps | render %.2f ms  readback %.2f ms  write %.2f ms per frame\n"
    "own CPU %.2fs = %.0f%% of one core (%.0f%% of 400%%)  maxRSS %ld kB  out %.1f MB/s\n",
    N, el/1000.0, N*1000.0/el, tRender/N, tRead/N, tWrite/N,
    cpu, cpu*100.0/(el/1000.0), cpu*100.0/(el/1000.0)/4.0,
    ru.ru_maxrss, N*1000.0/el*(double)W*H*4/1e6);
  return 0;
}
