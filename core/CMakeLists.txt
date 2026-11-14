add_library(machines_core STATIC turing.c synth.c transport.c machines_sequencer.c midi_controls.c note_mask.c machine_editor.c)
target_include_directories(machines_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_features(machines_core PUBLIC c_std_11)
target_compile_options(machines_core PRIVATE -Wall -Wextra)
