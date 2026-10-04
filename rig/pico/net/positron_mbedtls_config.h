// rig/pico/net/positron_mbedtls_config.h: the ONE mbedTLS 3.6.2 configuration, for the
// Pico and for the Linux test. Everything not named here is off.
//
// Sized for one server, measured with `openssl s_client` on 2026-10-04:
// ws.positron.studio negotiates TLS 1.3, and its chain is an ECDSA P-256 leaf
// (ecdsa-with-SHA256) from Google Trust Services WE1, an ECDSA P-256
// intermediate signed by GTS Root R4 with ecdsa-with-SHA384, and GTS Root R4
// (P-384) cross-signed by GlobalSign Root CA. We pin GTS Root R4 itself
// (gts_root_r4.h), so the RSA cross-sign is never VERIFIED.
//
// 🔴 BUT RSA HAS TO BE BUILT ANYWAY, MEASURED ON THE SECOND RUN: without
// MBEDTLS_RSA_C the handshake failed -0x262e "Signature algorithm (oid) is
// unsupported", because mbedTLS parses EVERY certificate the server sends
// before it verifies any, and the third one (R4 cross-signed by GlobalSign) is
// signed sha256WithRSAEncryption. oid.c only knows that OID under MBEDTLS_RSA_C.
// So the RSA code is linked and, as far as this chain goes, never run.
//
// 🔴 SHA-384 IS NOT OPTIONAL, AND IT IS WHAT pico-sdk #2633 TURNED OUT TO BE.
// That issue ("TLS 1.2 handshakes failing mbedtls_pk_verify() -0x4e00 after the
// move to mbedTLS 3") was closed for SDK 2.3.0 with the answer "define
// MBEDTLS_SHA384_C": mbedTLS 2 gave SHA-384 away with SHA512_C, 3.x does not,
// and an ECDSA signature over a SHA-384 digest then fails as a bad signature.
// It is NOT a TLS 1.2 bug and TLS 1.3 does not avoid it: WE1 is signed with
// ecdsa-with-SHA384, which is certificate path verification, the same in both.
//
// ⚠️ THE NAME IS NOT mbedtls_config.h ON PURPOSE. mbedTLS ships a file of that
// name in include/mbedtls/, and `#include MBEDTLS_CONFIG_FILE` in build_info.h
// finds the one beside itself first, so a config called mbedtls_config.h is
// silently replaced by mbedTLS's full default. It happened here, first build.
//
// Platform differences, and they are the only ones:
//   POSITRON_HOST   the Linux test: /dev/urandom entropy, real time, the
//                   certificate's dates ARE checked, error strings.
//   (the Pico)      the RP2350 TRNG via MBEDTLS_ENTROPY_HARDWARE_ALT,
//                   milliseconds from the SDK, and NO calendar time, so the dates are NOT checked
//                   until SNTP is added. The pinned root still decides who the
//                   server is; what is lost is refusing an expired certificate.
#ifndef POSITRON_MBEDTLS_CONFIG_H
#define POSITRON_MBEDTLS_CONFIG_H
#include <limits.h>

// ---- protocol
#define MBEDTLS_SSL_TLS_C
#define MBEDTLS_SSL_CLI_C
#define MBEDTLS_SSL_PROTO_TLS1_3
#define MBEDTLS_SSL_TLS1_3_KEY_EXCHANGE_MODE_EPHEMERAL_ENABLED
#define MBEDTLS_SSL_KEEP_PEER_CERTIFICATE         // TLS 1.3 requires it
#define MBEDTLS_SSL_SERVER_NAME_INDICATION        // Cloudflare picks the certificate by SNI
// 🔴 REQUIRED BY CLOUDFLARE. Without it the first run failed -0x7200 right after
// ServerHello: Cloudflare sends a dummy ChangeCipherSpec (RFC 8446 D.4) and
// mbedTLS logged "ChangeCipherSpec invalid in TLS 1.3 without compatibility mode".
#define MBEDTLS_SSL_TLS1_3_COMPATIBILITY_MODE
// No session tickets: a NewSessionTicket after the handshake is then read and
// ignored by mbedTLS ("not supported", ssl_msg.c), never surfaced to altcp.
// Two suites, ChaCha20-Poly1305 first: Cloudflare picked it from mbedTLS's
// default list on the first run, and it is the cheaper one in software on a
// core with no AES instructions (INFERRED, not measured on the RP2350).
// AES-128-GCM stays because TLS 1.3 makes it mandatory to implement.
#if defined(POSITRON_TLS12)
// TLS 1.2 as a fallback, built and tested only when asked for (-DPOSITRON_TLS12).
#define MBEDTLS_SSL_PROTO_TLS1_2
#define MBEDTLS_KEY_EXCHANGE_ECDHE_ECDSA_ENABLED
#define MBEDTLS_SSL_CIPHERSUITES MBEDTLS_TLS1_3_CHACHA20_POLY1305_SHA256, MBEDTLS_TLS1_3_AES_128_GCM_SHA256, \
  MBEDTLS_TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256, MBEDTLS_TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
#else
#define MBEDTLS_SSL_CIPHERSUITES MBEDTLS_TLS1_3_CHACHA20_POLY1305_SHA256, MBEDTLS_TLS1_3_AES_128_GCM_SHA256
#endif

// Record buffers. A server may send records of 16 KB, and Cloudflare did not
// acknowledge max_fragment_length when asked (openssl -maxfraglen 1024,
// 2026-10-04), so IN stays 16 KB unless the test proves a smaller one safe.
#ifndef POSITRON_TLS_IN
#define POSITRON_TLS_IN 16384
#endif
#define MBEDTLS_SSL_IN_CONTENT_LEN  POSITRON_TLS_IN
#define MBEDTLS_SSL_OUT_CONTENT_LEN 2048          // the node never sends more than WS_TX_MAX

// ---- crypto: TLS 1.3 runs on PSA
#define MBEDTLS_PSA_CRYPTO_C
#define MBEDTLS_CIPHER_C
#define MBEDTLS_AES_C
#define MBEDTLS_AES_FEWER_TABLES                  // a quarter of the AES tables, a little slower
#define MBEDTLS_GCM_C
#define MBEDTLS_CHACHA20_C
#define MBEDTLS_POLY1305_C
#define MBEDTLS_CHACHAPOLY_C
#define MBEDTLS_MD_C
#define MBEDTLS_HKDF_C
#define MBEDTLS_SHA256_C
#define MBEDTLS_SHA384_C
#define MBEDTLS_SHA512_C                           // sha512.c is where SHA-384 lives
#define MBEDTLS_CTR_DRBG_C
#define MBEDTLS_ENTROPY_C
#define MBEDTLS_BIGNUM_C
#define MBEDTLS_ECP_C
#define MBEDTLS_RSA_C                              // to PARSE the cross-sign, see the top
#define MBEDTLS_PKCS1_V15
#define MBEDTLS_ECDH_C
#define MBEDTLS_ECDSA_C
#define MBEDTLS_ECP_DP_SECP256R1_ENABLED          // the leaf and WE1 keys, and a key share
#define MBEDTLS_ECP_DP_SECP384R1_ENABLED          // GTS Root R4's key
#define MBEDTLS_ECP_DP_CURVE25519_ENABLED         // the key share offered first
#define MBEDTLS_ECP_NIST_OPTIM
#define MBEDTLS_ECP_WINDOW_SIZE 2                 // RAM over speed; default 4 (or 6)
#define MBEDTLS_ECP_FIXED_POINT_OPTIM 0
#define MBEDTLS_ASN1_PARSE_C
#define MBEDTLS_ASN1_WRITE_C
#define MBEDTLS_OID_C
#define MBEDTLS_PK_C
#define MBEDTLS_PK_PARSE_C
#define MBEDTLS_X509_USE_C
#define MBEDTLS_X509_CRT_PARSE_C
#define MBEDTLS_PEM_PARSE_C
#define MBEDTLS_BASE64_C

// ---- memory: a fixed arena, never libc malloc, on both sides
// MBEDTLS_PLATFORM_MEMORY makes every mbedTLS allocation go through a pointer.
//   On Linux it points at mbedtls_memory_buffer_alloc over a static array, whose
//   high water mark the test prints.
//   On the Pico, lwIP's altcp_tls_mbedtls_mem.c points it at lwIP's own heap,
//   which is a static array of MEM_SIZE bytes (pico/lwipopts.h), and
//   lwip_stats.mem.max is its high water mark. Doing both would race: altcp
//   resets the pointer when the first TLS config is created.
#define MBEDTLS_PLATFORM_C
#define MBEDTLS_PLATFORM_MEMORY
#if defined(POSITRON_HOST)
#define MBEDTLS_MEMORY_BUFFER_ALLOC_C
#define MBEDTLS_MEMORY_DEBUG
#endif

// altcp_tls_mbedtls.c reads ssl_context fields that 3.x made private.
#define MBEDTLS_ALLOW_PRIVATE_ACCESS

#define MBEDTLS_HAVE_TIME
#if defined(POSITRON_HOST)
#define MBEDTLS_HAVE_TIME_DATE
#define MBEDTLS_ERROR_C
#define MBEDTLS_DEBUG_C
#else
#define MBEDTLS_PLATFORM_MS_TIME_ALT              // mbedtls_ms_time() from the SDK clock, pico/main.c
#define MBEDTLS_NO_PLATFORM_ENTROPY
#define MBEDTLS_ENTROPY_HARDWARE_ALT              // mbedtls_hardware_poll() in the SDK's pico_mbedtls.c: the TRNG
// NOT MBEDTLS_SHA256_ALT, although the plan asked for the RP2350's SHA-256
// block. MEASURED at link time: the SDK's pico_mbedtls.c gives starts, update
// and finish but no mbedtls_sha256_clone, and md.c needs a clone because TLS
// keeps a running transcript hash and copies it. One hardware engine holds one
// state, so a clone cannot be written honestly. Software SHA-256 it is.
#endif

#endif
