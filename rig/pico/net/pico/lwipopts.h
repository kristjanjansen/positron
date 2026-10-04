// rig/pico/net/pico/lwipopts.h: lwIP for one TLS WebSocket, NO_SYS, polled.
// Started from pico-examples' lwipopts_examples_common.h (READ 2026-10-04) and
// changed where this node needs it; every change says why.
#ifndef POSITRON_LWIPOPTS_H
#define POSITRON_LWIPOPTS_H

#define NO_SYS                      1
#define LWIP_SOCKET                 0
#define LWIP_NETCONN                0
#define MEM_LIBC_MALLOC             0           // lwIP's heap is a static array, never newlib's malloc
#define MEM_ALIGNMENT               4
// The heap holds mbedTLS too (altcp_tls_mbedtls_mem.c routes mbedtls_calloc
// here): the 16 KB IN record buffer, 2 KB OUT, the parsed chain, PSA keys and
// the handshake. The Linux test MEASURED a peak of 31,824 bytes for mbedTLS on
// a 64 bit host; 64,000 leaves room for that, lwIP's own PBUF_RAM segments and
// altcp's per allocation header. lwip_stats.mem.max is printed every 30 s so the
// real figure on the board replaces this guess. (64,000 and not 65,536: above
// 64,000 lwIP widens mem_size_t to 32 bits.)
#define MEM_SIZE                    64000
#define MEMP_NUM_TCP_SEG            32
#define MEMP_NUM_ARP_QUEUE          10
#define PBUF_POOL_SIZE              24
#define LWIP_ARP                    1
#define LWIP_ETHERNET               1
#define LWIP_ICMP                   1
#define LWIP_RAW                    1
#define TCP_MSS                     1460
// altcp_tls_mbedtls.c warns if the window is smaller than one TLS record (16 KB),
// because a full record must fit before it can be decrypted.
#define TCP_WND                     (12 * TCP_MSS)
#define TCP_SND_BUF                 (4 * TCP_MSS)
#define TCP_SND_QUEUELEN            ((4 * (TCP_SND_BUF) + (TCP_MSS - 1)) / (TCP_MSS))
#define LWIP_NETIF_STATUS_CALLBACK  1
#define LWIP_NETIF_LINK_CALLBACK    1
#define LWIP_NETIF_HOSTNAME         1
#define LWIP_CHKSUM_ALGORITHM       3
#define LWIP_DHCP                   1
#define LWIP_IPV4                   1
#define LWIP_TCP                    1
#define LWIP_UDP                    1
#define LWIP_DNS                    1
#define LWIP_TCP_KEEPALIVE          1
#define LWIP_NETIF_TX_SINGLE_PBUF   1
#define DHCP_DOES_ARP_CHECK         0
#define LWIP_DHCP_DOES_ACD_CHECK    0

#define LWIP_STATS                  1
#define MEM_STATS                   1           // lwip_stats.mem.max: the heap's high water mark
#define SYS_STATS                   0
#define MEMP_STATS                  0
#define LINK_STATS                  0
#define LWIP_STATS_DISPLAY          0

// The TLS layer.
#define LWIP_ALTCP                  1
#define LWIP_ALTCP_TLS              1
#define LWIP_ALTCP_TLS_MBEDTLS      1
// 🔴 lwIP's DEFAULT IS MBEDTLS_SSL_VERIFY_OPTIONAL (altcp_tls_mbedtls_opts.h,
// READ in the image): a certificate that fails verification is LOGGED and the
// handshake carries on, so a pinned root would pin nothing. REQUIRED aborts.
#define ALTCP_MBEDTLS_AUTHMODE      MBEDTLS_SSL_VERIFY_REQUIRED

#endif
