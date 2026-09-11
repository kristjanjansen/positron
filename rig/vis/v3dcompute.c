// v3dcompute.c — does the Pi 4's V3D actually RUN a GLES 3.1 compute shader,
// and how fast? Headless EGL/GBM. Proves it by reading the result back.
//   gcc -O2 -o v3dcompute v3dcompute.c $(pkg-config --cflags --libs egl glesv2 gbm)
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <time.h>
#include <gbm.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES3/gl31.h>

static double now_ms(void){ struct timespec t; clock_gettime(CLOCK_MONOTONIC,&t);
  return t.tv_sec*1000.0 + t.tv_nsec/1e6; }

// A particle integrator: scatter-style state update, the thing WebGL2 cannot do
// without transform feedback gymnastics.
static const char *CS =
  "#version 310 es\n"
  "layout(local_size_x = 64) in;\n"
  "layout(std430, binding = 0) buffer P { vec4 p[]; };\n"
  "uniform float uDt; uniform uint uN;\n"
  "void main(){\n"
  "  uint i = gl_GlobalInvocationID.x; if (i >= uN) return;\n"
  "  vec4 s = p[i];\n"
  "  vec2 pos = s.xy, vel = s.zw;\n"
  "  vec2 f = vec2(-pos.y, pos.x) * 0.7 - pos * 0.15;\n"
  "  f += 0.3 * vec2(sin(pos.y*7.0 + float(i)*0.001), cos(pos.x*7.0));\n"
  "  vel += f * uDt; vel *= 0.995; pos += vel * uDt;\n"
  "  p[i] = vec4(pos, vel);\n"
  "}\n";

int main(int argc, char **argv){
  unsigned N = argc > 1 ? (unsigned)atoi(argv[1]) : 262144;
  double SECS = argc > 2 ? atof(argv[2]) : 3.0;
  int fd = open("/dev/dri/renderD128", O_RDWR|O_CLOEXEC);
  if (fd < 0) { perror("renderD128"); return 1; }
  struct gbm_device *gbm = gbm_create_device(fd);
  PFNEGLGETPLATFORMDISPLAYEXTPROC gpd =
    (PFNEGLGETPLATFORMDISPLAYEXTPROC)eglGetProcAddress("eglGetPlatformDisplayEXT");
  EGLDisplay d = gpd(EGL_PLATFORM_GBM_KHR, gbm, NULL);
  EGLint a,b; if(!eglInitialize(d,&a,&b)){fprintf(stderr,"eglInitialize\n");return 1;}
  eglBindAPI(EGL_OPENGL_ES_API);
  EGLint ca[]={EGL_CONTEXT_MAJOR_VERSION,3,EGL_CONTEXT_MINOR_VERSION,1,EGL_NONE};
  EGLContext c = eglCreateContext(d, EGL_NO_CONFIG_KHR, EGL_NO_CONTEXT, ca);
  if(c==EGL_NO_CONTEXT){fprintf(stderr,"no ctx 0x%x\n",eglGetError());return 1;}
  eglMakeCurrent(d, EGL_NO_SURFACE, EGL_NO_SURFACE, c);
  printf("RENDERER %s / %s\n", glGetString(GL_RENDERER), glGetString(GL_VERSION));

  GLuint s = glCreateShader(GL_COMPUTE_SHADER);
  glShaderSource(s,1,&CS,NULL); glCompileShader(s);
  GLint ok=0; char log[4096];
  glGetShaderiv(s,GL_COMPILE_STATUS,&ok);
  if(!ok){ glGetShaderInfoLog(s,sizeof log,NULL,log);
    printf("COMPUTE SHADER DID NOT COMPILE:\n%s\n", log); return 4; }
  GLuint p = glCreateProgram(); glAttachShader(p,s); glLinkProgram(p);
  glGetProgramiv(p,GL_LINK_STATUS,&ok);
  if(!ok){ glGetProgramInfoLog(p,sizeof log,NULL,log);
    printf("COMPUTE PROGRAM DID NOT LINK:\n%s\n", log); return 4; }
  printf("compute shader compiled and linked OK\n");

  float *init = malloc((size_t)N*16);
  for (unsigned i=0;i<N;i++){ init[i*4+0]=((float)i/N)*2.f-1.f; init[i*4+1]=0.5f;
    init[i*4+2]=0.f; init[i*4+3]=0.f; }
  GLuint buf; glGenBuffers(1,&buf);
  glBindBuffer(GL_SHADER_STORAGE_BUFFER, buf);
  glBufferData(GL_SHADER_STORAGE_BUFFER, (GLsizeiptr)N*16, init, GL_DYNAMIC_COPY);
  glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, buf);
  glUseProgram(p);
  glUniform1f(glGetUniformLocation(p,"uDt"), 1.0f/60.0f);
  glUniform1ui(glGetUniformLocation(p,"uN"), N);

  for(int i=0;i<5;i++){ glDispatchCompute((N+63)/64,1,1);
    glMemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT); }
  glFinish();
  GLenum e = glGetError();
  if (e != GL_NO_ERROR) { printf("GL ERROR after dispatch: 0x%x\n", e); return 5; }

  double t0=now_ms(); long n=0;
  while(now_ms()-t0 < SECS*1000.0){
    glDispatchCompute((N+63)/64,1,1);
    glMemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
    glFinish(); n++;
  }
  double el=now_ms()-t0;
  printf("%u particles: %.1f dispatches/s  %.2f ms each  %.1f M particle-steps/s\n",
         N, n*1000.0/el, el/n, n*1000.0/el*N/1e6);

  float *out = (float*)glMapBufferRange(GL_SHADER_STORAGE_BUFFER, 0, 64, GL_MAP_READ_BIT);
  if (out) {
    printf("state after run (must differ from init 0.5/0/0): p[0]=%.4f,%.4f v=%.4f,%.4f\n",
           out[0], out[1], out[2], out[3]);
    glUnmapBuffer(GL_SHADER_STORAGE_BUFFER);
  } else printf("glMapBufferRange returned NULL (0x%x)\n", glGetError());
  return 0;
}
