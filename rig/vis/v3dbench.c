// v3dbench.c — headless GLES 3.1 fill-rate / post-processing / readback bench.
// EGL + GBM on a render node, no display, no X, no Wayland.
//   gcc -O2 -o v3dbench v3dbench.c -lEGL -lGLESv2 -lgbm -ldrm
//   ./v3dbench [width] [height] [seconds]
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <time.h>
#include <gbm.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES3/gl31.h>

static double now_ms(void) {
  struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec * 1000.0 + ts.tv_nsec / 1e6;
}

static const char *VS =
  "#version 310 es\n"
  "void main(){\n"
  "  vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2);\n"
  "  gl_Position = vec4(p*2.0-1.0, 0.0, 1.0);\n"
  "}\n";

// Trivial: constant colour. Pure raster/fill ceiling, no ALU.
static const char *FS_FLAT =
  "#version 310 es\n"
  "precision highp float;\n"
  "uniform float uT;\n"
  "out vec4 o;\n"
  "void main(){ o = vec4(0.2, 0.5, uT, 1.0); }\n";

// A representative generative post-processing pass: polar kaleidoscope fold,
// domain-warp displacement, 3 octaves of value noise, a feedback tap.
static const char *FS_KALEIDO =
  "#version 310 es\n"
  "precision highp float;\n"
  "uniform float uT; uniform vec2 uRes; uniform sampler2D uPrev;\n"
  "out vec4 o;\n"
  "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\n"
  "float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);\n"
  "  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }\n"
  "void main(){\n"
  "  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;\n"
  "  float a = atan(uv.y, uv.x), r = length(uv);\n"
  "  float seg = 6.2831853/8.0;\n"
  "  a = abs(mod(a + 0.5*seg, seg) - 0.5*seg);\n"      // kaleidoscope fold
  "  vec2 k = vec2(cos(a), sin(a))*r;\n"
  "  float w = n(k*4.0 + uT*0.3);\n"
  "  w += 0.5*n(k*8.0 - uT*0.2);\n"
  "  w += 0.25*n(k*16.0 + uT*0.5);\n"
  "  vec2 d = k + 0.08*vec2(cos(w*6.2831), sin(w*6.2831));\n"   // displacement
  "  vec3 c = 0.5 + 0.5*cos(6.2831*(w + vec3(0.0,0.33,0.67)) + uT);\n"
  "  vec3 fb = texture(uPrev, d*0.9 + 0.5).rgb;\n"              // feedback tap
  "  o = vec4(mix(c, fb, 0.62), 1.0);\n"
  "}\n";

// Cheap blur pass — what a bloom downsample chain actually looks like.
static const char *FS_BLUR =
  "#version 310 es\n"
  "precision highp float;\n"
  "uniform vec2 uRes; uniform sampler2D uPrev;\n"
  "out vec4 o;\n"
  "void main(){\n"
  "  vec2 t = 1.0/uRes; vec2 uv = gl_FragCoord.xy*t; vec3 s = vec3(0.0);\n"
  "  s += texture(uPrev, uv + vec2(-1,-1)*t).rgb;\n"
  "  s += texture(uPrev, uv + vec2( 0,-1)*t).rgb*2.0;\n"
  "  s += texture(uPrev, uv + vec2( 1,-1)*t).rgb;\n"
  "  s += texture(uPrev, uv + vec2(-1, 0)*t).rgb*2.0;\n"
  "  s += texture(uPrev, uv).rgb*4.0;\n"
  "  s += texture(uPrev, uv + vec2( 1, 0)*t).rgb*2.0;\n"
  "  s += texture(uPrev, uv + vec2(-1, 1)*t).rgb;\n"
  "  s += texture(uPrev, uv + vec2( 0, 1)*t).rgb*2.0;\n"
  "  s += texture(uPrev, uv + vec2( 1, 1)*t).rgb;\n"
  "  o = vec4(s/16.0, 1.0);\n"
  "}\n";

static GLuint mkprog(const char *fs) {
  GLuint v = glCreateShader(GL_VERTEX_SHADER), f = glCreateShader(GL_FRAGMENT_SHADER);
  glShaderSource(v, 1, &VS, NULL); glCompileShader(v);
  glShaderSource(f, 1, &fs, NULL); glCompileShader(f);
  GLint ok = 0; char log[4096];
  glGetShaderiv(f, GL_COMPILE_STATUS, &ok);
  if (!ok) { glGetShaderInfoLog(f, sizeof log, NULL, log); fprintf(stderr, "FS: %s\n", log); exit(2); }
  glGetShaderiv(v, GL_COMPILE_STATUS, &ok);
  if (!ok) { glGetShaderInfoLog(v, sizeof log, NULL, log); fprintf(stderr, "VS: %s\n", log); exit(2); }
  GLuint p = glCreateProgram();
  glAttachShader(p, v); glAttachShader(p, f); glLinkProgram(p);
  glGetProgramiv(p, GL_LINK_STATUS, &ok);
  if (!ok) { glGetProgramInfoLog(p, sizeof log, NULL, log); fprintf(stderr, "LINK: %s\n", log); exit(2); }
  return p;
}

static void mktarget(int w, int h, GLuint *tex, GLuint *fbo) {
  glGenTextures(1, tex);
  glBindTexture(GL_TEXTURE_2D, *tex);
  glTexStorage2D(GL_TEXTURE_2D, 1, GL_RGBA8, w, h);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_MIRRORED_REPEAT);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_MIRRORED_REPEAT);
  glGenFramebuffers(1, fbo);
  glBindFramebuffer(GL_FRAMEBUFFER, *fbo);
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, *tex, 0);
  if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
    fprintf(stderr, "fbo incomplete\n"); exit(3);
  }
}

int main(int argc, char **argv) {
  int W = argc > 1 ? atoi(argv[1]) : 1280;
  int H = argc > 2 ? atoi(argv[2]) : 720;
  double SECS = argc > 3 ? atof(argv[3]) : 3.0;
  const char *node = getenv("NODE") ? getenv("NODE") : "/dev/dri/renderD128";

  int fd = open(node, O_RDWR | O_CLOEXEC);
  if (fd < 0) { perror(node); return 1; }
  struct gbm_device *gbm = gbm_create_device(fd);
  if (!gbm) { fprintf(stderr, "gbm_create_device failed\n"); return 1; }

  PFNEGLGETPLATFORMDISPLAYEXTPROC getPlatformDisplay =
    (PFNEGLGETPLATFORMDISPLAYEXTPROC) eglGetProcAddress("eglGetPlatformDisplayEXT");
  EGLDisplay dpy = getPlatformDisplay(EGL_PLATFORM_GBM_KHR, gbm, NULL);
  EGLint maj, min;
  if (!eglInitialize(dpy, &maj, &min)) { fprintf(stderr, "eglInitialize failed\n"); return 1; }
  eglBindAPI(EGL_OPENGL_ES_API);

  EGLint ctxattr[] = {
    EGL_CONTEXT_MAJOR_VERSION, 3, EGL_CONTEXT_MINOR_VERSION, 1, EGL_NONE
  };
  EGLContext ctx = eglCreateContext(dpy, EGL_NO_CONFIG_KHR, EGL_NO_CONTEXT, ctxattr);
  if (ctx == EGL_NO_CONTEXT) { fprintf(stderr, "eglCreateContext failed 0x%x\n", eglGetError()); return 1; }
  if (!eglMakeCurrent(dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, ctx)) {
    fprintf(stderr, "eglMakeCurrent(surfaceless) failed 0x%x\n", eglGetError()); return 1;
  }

  printf("RENDERER   %s\n", glGetString(GL_RENDERER));
  printf("VENDOR     %s\n", glGetString(GL_VENDOR));
  printf("VERSION    %s\n", glGetString(GL_VERSION));
  printf("GLSL       %s\n", glGetString(GL_SHADING_LANGUAGE_VERSION));
  GLint mw = 0, ts = 0, wg[3] = {0,0,0}, inv = 0, ssbo = 0;
  glGetIntegerv(GL_MAX_TEXTURE_SIZE, &mw);
  glGetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, &ts);
  glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &wg[0]);
  glGetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &inv);
  glGetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &ssbo);
  printf("MAXTEX     %d\n", mw);
  printf("COMPUTE    shared=%d bytes  wg[0]=%d  invocations=%d  ssbo_bindings=%d\n", ts, wg[0], inv, ssbo);
  printf("SIZE       %dx%d  for %.1fs per case\n\n", W, H, SECS);

  GLuint vao; glGenVertexArrays(1, &vao); glBindVertexArray(vao);
  GLuint texA, fboA, texB, fboB;
  mktarget(W, H, &texA, &fboA);
  mktarget(W, H, &texB, &fboB);

  GLuint pFlat = mkprog(FS_FLAT), pKal = mkprog(FS_KALEIDO), pBlur = mkprog(FS_BLUR);
  glDisable(GL_DEPTH_TEST); glDisable(GL_BLEND);
  glViewport(0, 0, W, H);

  struct { const char *name; GLuint prog; int passes; int pingpong; } cases[] = {
    { "flat  1 pass  (fill ceiling)", pFlat, 1, 0 },
    { "kaleido+warp+feedback 1 pass", pKal,  1, 1 },
    { "kaleido + 3 blur passes     ", pKal,  4, 1 },
  };

  for (unsigned c = 0; c < sizeof cases / sizeof cases[0]; c++) {
    // warm up
    for (int i = 0; i < 10; i++) {
      glBindFramebuffer(GL_FRAMEBUFFER, fboA);
      glUseProgram(cases[c].prog); glDrawArrays(GL_TRIANGLES, 0, 3);
    }
    glFinish();
    double t0 = now_ms(); long frames = 0;
    GLuint src = texA, dstf = fboB, srct = texB, dstf2 = fboA;
    while (now_ms() - t0 < SECS * 1000.0) {
      for (int p = 0; p < cases[c].passes; p++) {
        GLuint prog = (p == 0) ? cases[c].prog : pBlur;
        glBindFramebuffer(GL_FRAMEBUFFER, dstf);
        glUseProgram(prog);
        GLint l;
        if ((l = glGetUniformLocation(prog, "uT")) >= 0) glUniform1f(l, (float)((now_ms()-t0)/1000.0));
        if ((l = glGetUniformLocation(prog, "uRes")) >= 0) glUniform2f(l, (float)W, (float)H);
        if ((l = glGetUniformLocation(prog, "uPrev")) >= 0) {
          glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D, src); glUniform1i(l, 0);
        }
        glDrawArrays(GL_TRIANGLES, 0, 3);
        // swap ping-pong
        GLuint tt = src; src = srct; srct = tt;
        GLuint tf = dstf; dstf = dstf2; dstf2 = tf;
      }
      glFinish();
      frames++;
    }
    double el = now_ms() - t0;
    double fps = frames * 1000.0 / el;
    printf("%-30s %7.1f fps   %6.2f ms/frame   %5.1f Mpix/s\n",
           cases[c].name, fps, el/frames, fps * W * H * cases[c].passes / 1e6);
  }

  // readback: the cost of getting pixels OUT
  {
    unsigned char *buf = malloc((size_t)W*H*4);
    glBindFramebuffer(GL_FRAMEBUFFER, fboA);
    glUseProgram(pKal); glDrawArrays(GL_TRIANGLES, 0, 3); glFinish();
    double t0 = now_ms(); int n = 0;
    while (now_ms() - t0 < SECS * 1000.0) {
      glBindFramebuffer(GL_FRAMEBUFFER, fboA);
      glUseProgram(pKal);
      GLint l = glGetUniformLocation(pKal, "uRes"); if (l>=0) glUniform2f(l, (float)W, (float)H);
      l = glGetUniformLocation(pKal, "uT"); if (l>=0) glUniform1f(l, (float)n*0.016f);
      glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D, texB);
      glDrawArrays(GL_TRIANGLES, 0, 3);
      glReadPixels(0, 0, W, H, GL_RGBA, GL_UNSIGNED_BYTE, buf);
      n++;
    }
    double el = now_ms() - t0;
    printf("%-30s %7.1f fps   %6.2f ms/frame   %5.1f MB/s out\n",
           "1 pass + glReadPixels RGBA8", n*1000.0/el, el/n, n*1000.0/el*W*H*4/1e6);
    // prove it is not a blank buffer
    long sum = 0; for (long i = 0; i < (long)W*H*4; i += 997) sum += buf[i];
    printf("  readback checksum (must be non-zero): %ld   first px %02x%02x%02x\n",
           sum, buf[0], buf[1], buf[2]);
    free(buf);
  }
  return 0;
}
