# rig/pico/firmware/CMakeLists.txt: the DIN MIDI router. Build with build.sh,
# which runs this inside Docker for PICO_BOARD=pico and PICO_BOARD=pico2_w.
cmake_minimum_required(VERSION 3.13)

include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)

project(positron_router C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# The routing core, compiled from its own folder and never copied.
set(ROUTE_CORE ${CMAKE_CURRENT_LIST_DIR}/../../route-core)

add_executable(router
  main.c
  midi_parse.c
  ssd1306.c
  ui.c
  ${ROUTE_CORE}/route_core.c
)
target_include_directories(router PRIVATE ${CMAKE_CURRENT_LIST_DIR} ${ROUTE_CORE})
target_compile_options(router PRIVATE -Wall -Wextra)
target_link_libraries(router pico_stdlib hardware_i2c hardware_uart hardware_irq)

# UART0 is MIDI, so stdio goes nowhere.
pico_enable_stdio_uart(router 0)
pico_enable_stdio_usb(router 0)
pico_add_extra_outputs(router)
