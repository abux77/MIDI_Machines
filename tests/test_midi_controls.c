#include <assert.h>
#include <stdio.h>
#include "midi_controls.h"
int main(void) {
    midi_controls_tx_t tx={0};midi_controls_rx_t rx={0};
    unsigned control,value;uint8_t bytes[6];
    /* Every possible native knob/BPM value must survive the DIN/USB protocol. */
    uint64_t now=0;
    for(unsigned knob=0;knob<MIDI_CONTROL_KNOBS;knob++) {
        unsigned start=knob==MIDI_CONTROL_TEMPO?40:0,end=knob==MIDI_CONTROL_TEMPO?240:255;
        for(unsigned v=start;v<=end;v++) {
            now+=MIDI_CONTROL_INTERVAL_US;
            assert(midi_controls_poll(&tx,knob,v,now,bytes)==6);
            assert(bytes[0]==0xb0&&bytes[1]==20+knob&&bytes[3]==0xb0&&bytes[4]==52+knob);
            assert(midi_controls_receive(&rx,bytes[0],bytes[1],bytes[2],&control,&value)&&control==knob);
            assert(midi_controls_receive(&rx,bytes[3],bytes[4],bytes[5],&control,&value)&&control==knob&&value==v);
            assert(!midi_controls_poll(&tx,knob,v,now+MIDI_CONTROL_INTERVAL_US,bytes));
        }
    }
    /* No duplicates, bounded traffic, periodic late-connection snapshots. */
    tx=(midi_controls_tx_t){0};
    assert(midi_controls_poll(&tx,0,128,0,bytes)==6);
    assert(!midi_controls_poll(&tx,0,129,39999,bytes));
    assert(midi_controls_poll(&tx,0,129,40000,bytes)==6);
    assert(!midi_controls_poll(&tx,0,129,2039999,bytes));
    assert(midi_controls_poll(&tx,0,129,2040000,bytes)==6);
    /* Standard 7-bit controllers work; other channels/CCs and orphan LSBs do not. */
    rx=(midi_controls_rx_t){0};
    assert(!midi_controls_receive(&rx,0xb0,52,64,&control,&value));
    assert(!midi_controls_receive(&rx,0xb1,20,127,&control,&value));
    assert(!midi_controls_receive(&rx,0x90,20,127,&control,&value));
    assert(!midi_controls_receive(&rx,0xb0,7,127,&control,&value));
    assert(!midi_controls_receive(&rx,0xb0,20,128,&control,&value));
    assert(midi_controls_receive(&rx,0xb0,20,127,&control,&value)&&value==255);
    assert(midi_controls_receive(&rx,0xb0,20,0,&control,&value)&&value==0);
    assert(midi_controls_receive(&rx,0xb0,26,0,&control,&value)&&value==40);
    assert(midi_controls_receive(&rx,0xb0,26,127,&control,&value)&&value==240);
    for(unsigned d=1;d<=4;d*=2) {
        now+=MIDI_CONTROL_INTERVAL_US;
        assert(midi_controls_poll(&tx,MIDI_CONTROL_DIVISION,d,now,bytes)==3);
        assert(midi_controls_receive(&rx,bytes[0],bytes[1],bytes[2],&control,&value)&&control==7&&value==d);
    }
    assert(!midi_controls_poll(&tx,8,0,now,bytes));
    assert(!midi_controls_poll(&tx,6,39,now,bytes));
    assert(!midi_controls_poll(&tx,7,3,now,bytes));
    assert(!midi_controls_receive(&rx,0xb0,27,3,&control,&value));
    puts("MIDI controls: full-resolution round trips, rate limiting, snapshots, validation passed");
}
