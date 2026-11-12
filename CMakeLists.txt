cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico CACHE STRING "Board")
include(pico_sdk_import.cmake)
project(midi_grids C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()
find_package(Python3 REQUIRED COMPONENTS Interpreter)
file(GLOB FACTORY_WAVS CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/samples/*.WAV")
add_custom_command(
    OUTPUT "${CMAKE_CURRENT_SOURCE_DIR}/src/factory.h" "${CMAKE_CURRENT_SOURCE_DIR}/core/grids_data.h"
    COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/embed_assets.py"
    DEPENDS tools/embed_assets.py data/grids_data.py ${FACTORY_WAVS}
    COMMENT "Regenerating factory sample library and pattern data"
    VERBATIM)
add_custom_target(factory_assets DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/src/factory.h" "${CMAKE_CURRENT_SOURCE_DIR}/core/grids_data.h")
add_subdirectory(core)
add_dependencies(grids_core factory_assets)
add_executable(midi_grids src/main.c src/audio.c src/storage.c src/flash_disk.c src/storage_usb.c src/usb_descriptors.c third_party/fatfs/ff.c third_party/fatfs/ffunicode.c)
add_dependencies(midi_grids factory_assets)
target_include_directories(midi_grids PRIVATE include src third_party/fatfs)
target_compile_options(midi_grids PRIVATE -Wall -Wextra)
target_compile_definitions(midi_grids PRIVATE PICO_STDIO_USB_USE_DEFAULT_DESCRIPTORS=0 PICO_STDIO_USB_ENABLE_IRQ_BACKGROUND_TASK=0 PICO_STDIO_USB_ENABLE_TINYUSB_INIT=0 PICO_STDIO_USB_ENABLE_RESET_VIA_VENDOR_INTERFACE=0 PICO_STDIO_USB_STDOUT_TIMEOUT_US=0 PICO_STACK_SIZE=4096)
target_link_libraries(midi_grids grids_core pico_stdlib hardware_uart hardware_adc hardware_pio hardware_dma hardware_clocks hardware_flash pico_flash pico_unique_id tinyusb_device tinyusb_board)
pico_generate_pio_header(midi_grids "${CMAKE_CURRENT_LIST_DIR}/src/i2s.pio")
# SDKs before generated linker sections can load this ASSERT-only fragment as
# an additional linker script alongside the SDK memory map.
if(COMMAND pico_include_in_generated_section)
    pico_include_in_generated_section(midi_grids post_end "${CMAKE_CURRENT_LIST_DIR}/cmake/storage_reservation.ld")
else()
    target_link_options(midi_grids PRIVATE "LINKER:--script=${CMAKE_CURRENT_LIST_DIR}/cmake/storage_reservation.ld")
endif()
pico_add_link_depend(midi_grids "${CMAKE_CURRENT_LIST_DIR}/cmake/storage_reservation.ld")
pico_enable_stdio_usb(midi_grids 1)
pico_enable_stdio_uart(midi_grids 0)
pico_add_extra_outputs(midi_grids)
