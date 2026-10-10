# rig/pico/patch/CMakeLists.txt: the Pico of /concepts/070/, a one link router
# with a patchbay screen. Build with build.sh, which runs this inside Docker for
# PICO_BOARD=pico.
cmake_minimum_required(VERSION 3.13)

include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)

project(positron_patch C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# The router's display, MIDI parser and font, and the routing core, compiled
# from their own folders and never copied.
set(FIRMWARE ${CMAKE_CURRENT_LIST_DIR}/../firmware)
set(ROUTE_CORE ${CMAKE_CURRENT_LIST_DIR}/../../route-core)

add_executable(patch
  main.c
  ${FIRMWARE}/midi_parse.c
  ${FIRMWARE}/ssd1306.c
  ${ROUTE_CORE}/route_core.c
)
target_include_directories(patch PRIVATE ${FIRMWARE} ${ROUTE_CORE})
target_compile_options(patch PRIVATE -Wall -Wextra)
target_link_libraries(patch pico_stdlib hardware_i2c hardware_uart hardware_irq)

# UART0 is MIDI, so stdio goes nowhere.
pico_enable_stdio_uart(patch 0)
pico_enable_stdio_usb(patch 0)
pico_add_extra_outputs(patch)
