#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
task_tmp=$(mktemp -d)
trap 'rm -rf "$task_tmp"' EXIT
cc -std=c11 -Wall -Wextra -Werror -Icore core/transport.c tests/test_transport.c -o "$task_tmp/transport"
"$task_tmp/transport"
cc -std=c11 -Wall -Wextra -Werror -Iinclude -Isrc -Ithird_party/fatfs src/storage.c third_party/fatfs/ff.c third_party/fatfs/ffunicode.c tests/test_storage.c -o "$task_tmp/storage"
"$task_tmp/storage"
python3 tests/test_patterns.py

cc -std=c11 -Wall -Wextra -Werror -Icore core/grids.c core/transport.c core/sequencer.c tests/test_sequencer.c -o "$task_tmp/sequencer"
"$task_tmp/sequencer"
python3 tests/test_convert_samples.py
cc -std=c11 -Wall -Wextra -Werror -Icore core/midi_controls.c tests/test_midi_controls.c -o "$task_tmp/midi-controls"
"$task_tmp/midi-controls"
cc -std=c11 -Wall -Wextra -Werror -Icore tests/test_knob_filter.c -o "$task_tmp/knob-filter"
"$task_tmp/knob-filter"

cc -std=c11 -Wall -Wextra -Werror -Icore core/turing.c core/transport.c core/machines_sequencer.c tests/test_turing.c -o "$task_tmp/turing"
"$task_tmp/turing"

cc -std=c11 -Wall -Wextra -Werror -Icore core/synth.c tests/test_synth.c -o "$task_tmp/synth"
"$task_tmp/synth"

cc -std=c11 -Wall -Wextra -Werror -Icore core/machine_editor.c core/note_mask.c tests/test_machine_editor.c -o "$task_tmp/editor"
"$task_tmp/editor"
