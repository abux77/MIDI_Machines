# MIDI Machines control board — Draft A

Open `MIDI_Machines_Control_Board.kicad_pro` in KiCad 9 or newer. The schematic has three A3 sheets and a self-contained symbol library. A review PDF is in [exports](exports/MIDI_Machines_Control_Board.pdf).

This draft implements the requested **nine controls**, superseding the earlier twelve-pot planning count. The older `*_12_INPUTS.csv` files describe the original ADC proposal and are not the BOM for this board. Use `BOM_DRAFT.csv` for this schematic; it includes unsourced items and is not a complete assembly order.

## Sheets

1. **Pico, ADC and power:** original RP2040 Pico, AD7490 sixteen-channel SPI ADC, REF3125 2.5 V reference, 5 V AHCT NeoPixel data buffer, supply decoupling and LED bulk capacitor.
2. **3 × 3 controls:** RV1–RV9, ALPS RK09K1130D62 10k linear transparent-shaft pots; D1–D9, WS2812B-2020-V6 pixels. Positions are numbered left-to-right, top-to-bottom. Each wiper has a 100 Ω / 1 µF filter. Each pixel has 100 nF local decoupling.
3. **Buttons and display:** two illuminated momentary SPDT buttons based on the Tayda PS01/A-7701 example, pull-ups and LED resistors. Provisional 3.3 V I²C and SPI display headers allow a module to be selected later. J3 reserves MIDI/DAC logic signals.

The grid on the schematic expresses the control arrangement. Board dimensions, physical spacing, mounting holes, display location and PCB routing have not been designed.

## Connections

| Function | Pico GPIO |
| --- | --- |
| ADC / shared SPI SCK, MOSI, MISO | GP2, GP3, GP4 |
| ADC CS | GP5 |
| Button 1 / 2 LED | GP6 / GP7 |
| Button 1 / 2 active-low input | GP10 / GP14 |
| Display reset / CS / DC | GP15 / GP17 / GP18 |
| Display I²C SDA / SCL | GP20 / GP21 |
| NeoPixel data through AHCT buffer | GP22 |
| Reserved MIDI TX / RX | GP0 / GP1 |
| Reserved I²S BCK / LRCLK / DATA | GP11 / GP12 / GP13 |

The pots run between VREF_2V5 and ground; their wipers feed VIN0–VIN8. Unused ADC channels and the manufacturer's NC-to-AGND pins are grounded. Firmware must select the 0–REFIN range (RANGE=1), straight binary, and accommodate ADC acquisition settling.

Pixel pin numbers follow the **V6** datasheet: 1 DO, 2 GND, 3 DI, 4 VDD. They chain D1 through D9; the final output is intentionally unused. U3 translates 3.3 V data to 5 V, followed by 330 Ω. A 100 kΩ input pull-down keeps the buffer input defined during reset.

## Open design items

- Pot, NeoPixel and button footprints are deliberately unassigned. Confirm the ALPS mounting drawing, LED orientation and clearance beneath the shaft before layout. Adafruit's Eagle files in `../references` are a placement reference, not a substitute for the V6 LED pad map.
- The button symbols use **logical pin names**, not verified physical pad numbers. Check the exact purchased PS01/PB86 variant with its drawing and continuity measurements before assigning a footprint. The example red LED has a 1 kΩ series resistor for approximately 1 mA from a Pico GPIO. Other colours may need a different resistor.
- Display headers are provisional breakout pin orders. Select the display and connector before PCB layout; add I²C pull-ups if the chosen module does not include them. No display, backlight circuit or mounting dimensions are selected.
- This draft uses the Pico's USB VBUS for pixels and 3V3_OUT for the ADC/reference. Nine V6 pixels at full white can draw approximately 324 mA, plus other electronics and the eventual display. Review USB current declaration, host/cable limits and brightness limits before use. Do not inject external 5 V onto VBUS while USB is attached. C9 is a provisional 470 µF bulk capacitor; select its package and review USB inrush/power switching before finalizing power.
- Firmware has **not** been adapted to this proposed ADC, pin assignment, nine-pixel grid or buttons. Existing hardware/firmware remains a separate revision. No MIDI electrical interface or DAC is implemented on these sheets.
- `BOM_DRAFT.csv` contains selected LCSC identifiers where known. Blank identifiers and provisional parts still need sourcing. The existing twelve-input JLCPCB BOM is not an order for this schematic. No PCB/CPL/manufacturing files are supplied.

## Verification and regeneration

KiCad 10.0.7 successfully exported all three sheets and the XML netlist. ERC reports **0 errors and 49 warnings**: all warnings concern standard footprint libraries absent from this machine. These checks do not validate the unassigned mechanical footprints. The full report is `exports/ERC.rpt`.

The exported netlist is checked independently for nine filtered ADC channels, the pixel chain, power domains, button pull-ups/LEDs and Pico/display connections:

```sh
kicad-cli sch export netlist --format kicadxml MIDI_Machines_Control_Board.kicad_sch -o /tmp/machines-board.xml
python3 validate_schematic.py /tmp/machines-board.xml
kicad-cli sch erc MIDI_Machines_Control_Board.kicad_sch -o exports/ERC.rpt
kicad-cli sch export pdf MIDI_Machines_Control_Board.kicad_sch -o exports/MIDI_Machines_Control_Board.pdf
```

`generate_schematic.py` created the initial sheets and local library. Re-running it overwrites those files, including edits made in KiCad; use normal KiCad editing after this initial draft. The script currently reads KiCad's installed project template from `/usr/share/kicad/template/kicad.kicad_pro`. `connections.json` records the generator's intended nets; validation uses KiCad's actual exported netlist instead.

New datasheets: [Worldsemi V6](../datasheets/WS2812B-2020-V6.pdf), from LCSC's manufacturer PDF; [TI SN74AHCT1G125](../datasheets/SN74AHCT1G125.pdf), from TI. Selected ordering codes: WS2812B-2020-V6 / C52917434; SN74AHCT1G125DBVR / C7484. Recheck assembly availability before ordering.

## Continuation — 2026-11-14

The controls sheet now draws each 100 Ω / 1 µF filter and each pixel's
100 nF supply bypass connection explicitly. KiCad-exported net membership was
compared before and after: every net is unchanged. The independent connectivity
validator passes; ERC remains at 0 errors / 49 missing-footprint-library warnings.
The review PDF and ERC report have been refreshed. The mechanical, display and
power questions above remain open. The generated draft has now been edited;
do not run the initial generator over these changes.
