// rig/pico/net/gts_root_r4.h: the ONE trust anchor, pinned.
//
// GTS Root R4, Google Trust Services LLC. ECDSA P-384, self-signed,
// valid 2016-06-22 to 2036-06-22.
//   fetched   https://i.pki.goog/r4.pem on 2026-10-04 (Google's own repository, pki.goog)
//   sha256 of the DER (certificate fingerprint)
//             34:9D:FA:40:58:C5:E2:63:12:3B:39:8A:E7:95:57:3C:4E:13:13:C8:3F:E6:8F:93:55:6C:D5:E8:03:1B:3C:7D
//   checked   the same fingerprint as the "GTS Root R4" in macOS's
//             SystemRootCertificates.keychain on this Mac, the same day
//   sha256 of the PEM file as fetched: 7e8b80d078d3dd77d3ed2108dd2b33412c12d7d72cb0965741c70708691776a2
//
// WHY THE ROOT AND NOT THE LEAF: ws.positron.studio's leaf is from WE1 and was
// valid 2026-09-04 to 2026-12-03, so it rotates about every 90 days and a
// pinned leaf would brick the node within a quarter. WE1 runs to 2029-02-20;
// the root to 2036. The server sends R4 cross-signed by GlobalSign Root CA as
// its third certificate; mbedTLS finds WE1's issuer in this trust list first,
// verifies WE1 against this key (the same key the cross-sign carries) and stops.
// ⚠️ IF THE ZONE EVER MOVES TO ANOTHER CA (Let's Encrypt, say), THIS FAILS
// CLOSED: the node refuses the relay. That is the right failure for a pin, and
// the fix is a second PEM concatenated here, not turning verification off.
#ifndef POSITRON_GTS_ROOT_R4_H
#define POSITRON_GTS_ROOT_R4_H
// NUL terminated PEM, as mbedtls_x509_crt_parse and altcp_tls_create_config_client want it.
static const char GTS_ROOT_R4_PEM[] =
  "-----BEGIN CERTIFICATE-----\n"
  "MIICCTCCAY6gAwIBAgINAgPlwGjvYxqccpBQUjAKBggqhkjOPQQDAzBHMQswCQYD\n"
  "VQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEUMBIG\n"
  "A1UEAxMLR1RTIFJvb3QgUjQwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAwMDAw\n"
  "WjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2Vz\n"
  "IExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjQwdjAQBgcqhkjOPQIBBgUrgQQAIgNi\n"
  "AATzdHOnaItgrkO4NcWBMHtLSZ37wWHO5t5GvWvVYRg1rkDdc/eJkTBa6zzuhXyi\n"
  "QHY7qca4R9gq55KRanPpsXI5nymfopjTX15YhmUPoYRlBtHci8nHc8iMai/lxKvR\n"
  "HYqjQjBAMA4GA1UdDwEB/wQEAwIBhjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQW\n"
  "BBSATNbrdP9JNqPV2Py1PsVq8JQdjDAKBggqhkjOPQQDAwNpADBmAjEA6ED/g94D\n"
  "9J+uHXqnLrmvT/aDHQ4thQEd0dlq7A/Cr8deVl5c1RxYIigL9zC2L7F8AjEA8GE8\n"
  "p/SgguMh1YQdc4acLa/KNJvxn7kjNuK8YAOdgLOaVsjh4rsUecrNIdSUtUlD\n"
  "-----END CERTIFICATE-----\n"
  ;
#endif
