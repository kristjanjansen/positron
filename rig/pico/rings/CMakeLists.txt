# rig/pico/rings/CMakeLists.txt: the rings of /concepts/14/ on a Pico's OLED.
# Build with build.sh, which runs this inside Docker for PICO_BOARD=pico.
cmake_minimum_required(VERSION 3.13)

include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)

project(positron_rings C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# The router's display and MIDI parser, compiled from its folder, never copied.
set(FIRMWARE ${CMAKE_CURRENT_LIST_DIR}/../firmware)

add_executable(rings
  main.c
  ${FIRMWARE}/midi_parse.c
  ${FIRMWARE}/ssd1306.c
)
target_include_directories(rings PRIVATE ${FIRMWARE})
target_compile_options(rings PRIVATE -Wall -Wextra)
target_link_libraries(rings pico_stdlib hardware_i2c hardware_uart hardware_irq m)

# UART0 is MIDI, so stdio goes nowhere.
pico_enable_stdio_uart(rings 0)
pico_enable_stdio_usb(rings 0)
pico_add_extra_outputs(rings)
