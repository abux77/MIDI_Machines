cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico CACHE STRING "Board")
include(pico_sdk_import.cmake)
project(midi_machines C CXX ASM)
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
file(GLOB SYNTH_WAVS CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/samples/synth/*.wav")
add_custom_command(
    OUTPUT "${CMAKE_CURRENT_SOURCE_DIR}/core/synth_data.h" "${CMAKE_CURRENT_SOURCE_DIR}/web/synth-samples.js"
    COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/embed_synth.py"
    DEPENDS tools/embed_synth.py samples/synth/manifest.json ${SYNTH_WAVS}
    COMMENT "Embedding CC0 looped synth waveforms"
    VERBATIM)
add_custom_target(synth_assets DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/core/synth_data.h" "${CMAKE_CURRENT_SOURCE_DIR}/web/synth-samples.js")
file(GLOB USER_SYNTH_WAVS CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/web/assets/synth/user-*.wav")
add_custom_command(OUTPUT "${CMAKE_CURRENT_SOURCE_DIR}/core/hardware_synth_data.h"
 COMMAND "${Python3_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/embed_hardware_synth.py"
 DEPENDS tools/embed_hardware_synth.py samples/synth/user-manifest.json ${USER_SYNTH_WAVS} ${SYNTH_WAVS}
 VERBATIM)
add_custom_target(hardware_synth_assets DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/core/hardware_synth_data.h")
add_subdirectory(core)
add_dependencies(machines_core factory_assets synth_assets hardware_synth_assets)
add_executable(midi_machines src/main.c src/audio.c src/storage.c src/flash_disk.c src/storage_usb.c src/usb_descriptors.c third_party/fatfs/ff.c third_party/fatfs/ffunicode.c)
add_dependencies(midi_machines factory_assets)
target_include_directories(midi_machines PRIVATE include src third_party/fatfs)
target_compile_options(midi_machines PRIVATE -Wall -Wextra)
target_compile_definitions(midi_machines PRIVATE MACHINES_COMPACT_FACTORY=1 PICO_STDIO_USB_USE_DEFAULT_DESCRIPTORS=0 PICO_STDIO_USB_ENABLE_IRQ_BACKGROUND_TASK=0 PICO_STDIO_USB_ENABLE_TINYUSB_INIT=0 PICO_STDIO_USB_ENABLE_RESET_VIA_VENDOR_INTERFACE=0 PICO_STDIO_USB_STDOUT_TIMEOUT_US=0 PICO_STACK_SIZE=4096)
target_link_libraries(midi_machines machines_core pico_stdlib hardware_uart hardware_adc hardware_pio hardware_dma hardware_clocks hardware_flash pico_flash pico_unique_id tinyusb_device tinyusb_board)
pico_generate_pio_header(midi_machines "${CMAKE_CURRENT_LIST_DIR}/src/i2s.pio")
# SDKs before generated linker sections can load this ASSERT-only fragment as
# an additional linker script alongside the SDK memory map.
if(COMMAND pico_include_in_generated_section)
    pico_include_in_generated_section(midi_machines post_end "${CMAKE_CURRENT_LIST_DIR}/cmake/storage_reservation.ld")
else()
    target_link_options(midi_machines PRIVATE "LINKER:--script=${CMAKE_CURRENT_LIST_DIR}/cmake/storage_reservation.ld")
endif()
pico_add_link_depend(midi_machines "${CMAKE_CURRENT_LIST_DIR}/cmake/storage_reservation.ld")
pico_enable_stdio_usb(midi_machines 1)
pico_enable_stdio_uart(midi_machines 0)
pico_add_extra_outputs(midi_machines)
