add_library(grids_core STATIC grids.c transport.c sequencer.c midi_controls.c)
target_include_directories(grids_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_features(grids_core PUBLIC c_std_11)
target_compile_options(grids_core PRIVATE -Wall -Wextra)
