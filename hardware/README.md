# Twelve-pot SPI ADC hardware proposal

Proposed next-board input circuit for MIDI Machines, also suitable for MIDI Grids.
The existing Pico firmware still uses the CD74HC4067 mux and built-in ADC; this
folder documents a future hardware revision. No firmware pin mapping, schematic,
PCB layout, or pick-and-place file has been created for this ADC yet.

## Files

- [JLCPCB_BOM_12_INPUTS.csv](JLCPCB_BOM_12_INPUTS.csv): standard JLCPCB BOM columns,
  grouped by exact LCSC part number, with 33 SMT placements across six part types.
- [BOM_DETAILS_12_INPUTS.csv](BOM_DETAILS_12_INPUTS.csv): quantities, manufacturer
  part numbers, ratings, purpose, supplier links, and datasheet links.
- [POTENTIOMETER_BOM.csv](POTENTIOMETER_BOM.csv): selected ALPS part and sourcing identifiers.
- [MANUAL_PARTS.csv](MANUAL_PARTS.csv): twelve separately sourced ALPS RK09K1130D62
  10 kΩ linear clear-shaft pots, plus twelve planned NeoPixel-compatible LEDs.
  The LED package remains to be selected; these are not in the SMT BOM.
- [datasheets/](datasheets/): local PDF copies for all six SMT part types, the selected ALPS pot family, and
  the earlier Alpha candidate (retained for reference). The YAGEO
  PDFs are the manufacturer's shared general-purpose MLCC series specification.
- [sourcing.json](sourcing.json): source URLs, download timestamps, PDF SHA-256
  hashes, and verified JLCPCB part mappings. Stock and prices can change.

This is an input-stage BOM for one board, not a complete MIDI Machines pedal BOM.
The Pico, MIDI circuitry, audio DAC, LEDs, buttons, connectors, power circuitry,
panel hardware, and enclosure remain outside its scope. Designators here are
provisional and must match the final schematic and PCB before an assembly order.
JLCPCB assembly additionally needs manufacturing and placement files from that PCB.
Manufacturer PDFs retain their original ownership and notices.

## Selected parts

| Part | JLCPCB/LCSC | Quantity | Role |
|---|---|---:|---|
| AD7490BRUZ-REEL7 | C36884 | 1 | 16-channel, 12-bit SPI ADC |
| REF3125AIDBZR | C33297 | 1 | 2.5 V reference and potentiometer excitation |
| 0603WAF1000T5E | C22775 | 12 | 100 Ω, 1%, 0603 wiper resistors |
| CC0603KRX7R9BB104 | C14663 | 3 | 100 nF, 50 V, X7R, 0603 |
| CC0603KRX7R7BB105 | C106248 | 14 | 1 µF, 16 V, X7R, 0603 |
| GRM21BR71C106KE51L | C408142 | 2 | 10 µF, 16 V, X7R, 0805 |

All three capacitor selections use X7R and meet the requested >=10 V rating.
Check effective capacitance at operating DC bias using the manufacturer's data.
The ADC, reference, 1 µF and 10 µF capacitors are Extended parts; the 100 Ω
resistor and 100 nF capacitor are Basic parts. Recheck classifications when ordering.

## Reference and power wiring

Use the Pico's 3V3(OUT) supply, not ADC_VREF, for the proposed 3.3 V rail.

| Designator | Connection |
|---|---|
| U2 pin 1 (IN) | 3.3 V |
| U2 pin 2 (OUT) | VREF_2V5: U1 REFIN and upper ends of all pots |
| U2 pin 3 (GND) | Ground |
| C1, 1 µF | U2 IN to ground, close to U2 |
| C2, 1 µF | U2 OUT to ground, close to U2 |
| U1 VDD | 3.3 V; C4 (100 nF) and C5 (10 µF) to AGND |
| U1 VDRIVE | 3.3 V; C6 (100 nF) and C7 (10 µF) to AGND |
| U1 REFIN | VREF_2V5; C3 (100 nF) to AGND, close to U1 |
| U1 AGND pins | Ground plane |

Configure U1 for straight-binary output and the 0–REFIN range (RANGE = 1).
The usable input range is then 0–2.5 V. Do not power the pots from 3.3 V with
this range setting. The ADC itself still needs 3.3 V, not the 2.5 V reference.
Use 3.3 V SPI signaling and a common ground with the Pico.

Twelve nominal 10 kΩ pots draw 3 mA; sixteen draw 4 mA. At -20% resistance
tolerance those become 3.75 mA and 5 mA, respectively, plus ADC reference current.
REF3125 can source up to 10 mA, so the proposed pot load does not require a
separate buffer. Do not attach LEDs or other unrelated loads to VREF_2V5.

## Per-input filter

```text
VREF_2V5 ─── top of 10k linear pot
AGND ─────── bottom of pot

pot wiper ── 100 Ω ──┬── U1 VINn
                     │
                    1 µF
                     │
                    AGND
```

RV1–RV12 connect to VIN0–VIN11. R1–R12 are their series resistors;
C8–C19 are their filter capacitors in matching order. Place the capacitors near
U1. Leave VIN12–VIN15 out of the scan and tie them to AGND if unused.

At the middle of a nominal 10 kΩ pot, the source resistance is 2.5 kΩ. Including
the 100 Ω resistor, the filter time constant is at most about 2.6 ms nominal
(about 3.1 ms for a +20% pot, before capacitor/resistor tolerances). At an end stop
it is about 0.1 ms. That smooths fast changes while remaining responsive to knob
movement. The local capacitor also supplies the ADC's sampling charge.

Start around 500 readings per second per active input (6,000 conversions/second
for twelve pots). Validate acquisition timing, channel settling, noise, crosstalk,
and effective resolution at the chosen SPI speed; do not assume a pot can directly
drive this ADC at its maximum advertised conversion rate. Retain software smoothing.
A firmware driver must handle the AD7490's channel-selection timing and returned
channel IDs correctly.

## Layout and expansion

Use a continuous ground plane and short local analog return paths. Route SPI,
I²S, and high-current digital returns away from pot/reference traces. Avoid
splitting the ground plane underneath signal routes. Place each high-frequency
bypass capacitor directly by its associated pin, with a short return to ground.

To populate all sixteen inputs later, add four pots, four 100 Ω resistors, and
four 1 µF filter capacitors. No change to the ADC or reference is required for
that nominal load, but update the schematic, designators, BOM, and firmware scan.

## Source documents

The local AD7490 PDF is manufacturer Rev. D from a mirror because the current
manufacturer download was unavailable from this environment. The current Rev. E
manufacturer link is below and in `sourcing.json`; review it before final design.
The REF31xx local PDF is Rev. E (April 2026). Passive PDFs are manufacturer family
specifications supplied by LCSC, not guaranteed part-specific characterization sheets.


- [Analog Devices AD7490 datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/ad7490.pdf):
  reference requirements, input range, acquisition, serial interface, and layout.
- [TI REF31xx datasheet](https://www.ti.com/lit/gpn/REF31): REF3125 pinout,
  2.5 V output, input bypassing, and output-current capability.
- Passive-component supplier pages and PDF download URLs are in `sourcing.json`.

These values are a documented prototype starting point, not a bench-validated
schematic. Recheck stock, part mappings, pin numbers, footprints, and placement
against the final board before ordering.

## Selected clear-shaft pots and planned NeoPixels

Selected by the user: **ALPS Alpine RK09K1130D62**, twelve pieces, separately
sourced and manually assembled. This supersedes the Alpha RV09BF-40E1 proposal.
The Alpha PDF is retained only as a reference and must not drive the footprint.

- 10 kΩ nominal, linear taper **1B**, ±20%, rated 50 mW.
- Vertical through-hole construction; shaft length **LM1 = 20 mm**.
- Clear shaft, **no detent**, and no sleeve/collar on this variant.
- [POTENTIOMETER_BOM.csv](POTENTIOMETER_BOM.csv) records the exact part and sources.
- DigiKey: **4809-RK09K1130D62-ND**, [product listing](https://www.digikey.com/en/products/detail/alps-alpine/RK09K1130D62/21721547).
- LCSC sourcing alternative: **C470399**, [product listing](https://www.lcsc.com/product-detail/C470399.html).
  An LCSC listing alone does not establish JLCPCB through-hole assembly availability.

Manufacturer references:

- [Exact ALPS product page](https://tech.alpsalpine.com/e/products/detail/RK09K1130D62/).
- [Local ALPS RK09K/RK09D catalog](datasheets/ALPS_RK09K_RK09D.pdf): the product
  table identifies RK09K1130D62 as the clear-shaft version; use **Drawing 14**.
- [Exact-part dimensions](drawings/RK09K1130D62_dimensions.gif).
- [PCB mounting holes](drawings/RK09K1130D62_mounting_holes.gif), viewed from the mounting side.
- [Terminal layout and circuit](drawings/RK09K1130D62_terminals.gif).

Adafruit's [NeoPot](https://www.adafruit.com/product/6387) uses this exact pot
with an LED beneath its shaft, demonstrating the intended light-pipe arrangement.
This does not establish interchangeability with the former Alpha footprint.
Design PCB/panel support around this pot's actual mounting tabs and dimensions;
do not assume the Alpha's threaded-bushing mounting is available on this variant.
The 10 kΩ electrical choice leaves the proposed ADC/reference/filter values intact.

Plan **one NeoPixel-compatible RGB LED behind each pot**, twelve in total. Check
emitter position, LED height, light-pipe opening, mounting tabs, solder clearance,
and PCB-to-panel spacing before choosing the LED footprint. Addressable LEDs
can be daisy-chained DIN/DOUT; their exact data timing and current depend on the
selected part. Keep the mechanical and electrical LED choices open until then.

Power the LEDs from a suitably rated LED supply, never from the 2.5 V reference.
Use a common ground plane, but route LED power/return currents away from the
ADC reference and pot-wiper paths. For 5 V LEDs, plan suitable 3.3-to-5 V data
level shifting unless the selected LED's datasheet explicitly guarantees 3.3 V
input logic at that supply. Provide the selected LED's local bypass capacitors,
input protection/data-series resistor, and supply bulk capacitance as appropriate.
Budget current using the exact LED's specified worst-case draw and supply limits;
do not assume the Pico's 3.3 V output or a low-power USB connection can supply it.

See [Adafruit's NeoPixel wiring guidance](https://learn.adafruit.com/adafruit-neopixel-uberguide/best-practices)
for general supply, data-level, and grounding considerations. The LED driver,
control behavior, power-support BOM, and firmware support are future work; the
existing six-line JLCPCB BOM continues to cover only the ADC input stage.

## Adafruit NeoPot design reference

The original Eagle files are saved in
[references/Adafruit-NeoPot-PCB/](references/Adafruit-NeoPot-PCB/):

- [Schematic](<references/Adafruit-NeoPot-PCB/Adafruit NeoPot Breakout.sch>)
- [PCB layout](<references/Adafruit-NeoPot-PCB/Adafruit NeoPot Breakout.brd>)
- Original README and license.txt, retained with the unmodified reference files.

Source: [Adafruit-NeoPot-PCB](https://github.com/adafruit/Adafruit-NeoPot-PCB),
main branch, downloaded 2026-11-13. These are Adafruit's original reference
files, not our new PCB. Their LED package placement provides a useful starting
point for the ALPS pot; verify any replacement LED's pad geometry and orientation.

## Planned illuminated push buttons

The user would like **PB86-A1-style** illuminated momentary push buttons on the
control board. These are digital switches; they do not consume potentiometer
ADC channels. Button quantity, function assignments, cap colours, and LED colours
remain **TBD** and are recorded that way in `MANUAL_PARTS.csv`.

The supplied sourcing example is
[Tayda A-7701](https://www.taydaelectronics.com/black-push-switch-momentary-spdt-pcb-pins-led-mount.html).
Tayda identifies this as **ZTDA PS01**, a black-cap, red-LED, PCB-pin momentary
SPDT switch, with a 12.5 × 17.6 mm outline and 2.0 ±0.4 mm travel. The switch
contacts are rated 12 mA at 24 VDC. The LED is specified at 1.8–2.4 V with a
20 mA maximum. The 24 V figure is a contact rating, not a supply to apply to the
Pico or the LED. These figures belong to Tayda's exact product listing.

A PB86-A1 name on AliExpress is not a complete manufacturer/order-code guarantee.
Honyone markets a similar PB86 family; the exact supplied switch may have a
different cap, LED pin arrangement, or mechanical detail. Do not assume Tayda's
ZTDA PS01, a Honyone PB86-A1 variant, and an unqualified AliExpress listing are
pin-for-pin interchangeable. Obtain a sample and verify continuity and dimensions
before locking the board footprint.

Saved reference files:

- [Tayda PS01/A-7701 mechanical drawing](datasheets/Tayda_PS01_A7701_drawing.pdf).
  Tayda links to a shared drawing named A-6805.pdf; that original source URL is
  preserved in `button-sources.json`.
- [Honyone PB86 family sheet](drawings/Honyone_PB86_series.png).
- [Honyone mechanical drawing](drawings/Honyone_PB86_drawing.jpg).
- [Honyone order-code diagram](drawings/Honyone_PB86_order_codes.jpg).
- [Document sources and hashes](button-sources.json).

For a simple active-low digital input, connect COM to ground and the verified
normally-open contact to a Pico input with a 3.3 V pull-up; leave the normally-closed
contact unconnected. Confirm actual terminal identification with the purchased
switch. Debounce in firmware. A larger button count may need an input expander
or matrix; pin allocation and scan hardware have not been selected yet.

The built-in indicator is a conventional single-colour LED, separate from the
switch contacts. Give every LED its own current-limiting resistor and size its
GPIO/driver circuit for the final quantity and supply. As an initial calculation,
a 1 kΩ resistor from a 3.3 V drive gives about 0.9–1.5 mA for Tayda's stated
forward-voltage range; validate desired brightness and driver headroom. Do not
power button LEDs from VREF_2V5. They are not individually addressable NeoPixels;
the RGB LEDs under the ALPS pots remain a separate illumination circuit.
