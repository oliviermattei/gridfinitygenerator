import { describe, expect, it } from "vitest";
import { bambuSettings, bambuTargetOf } from "../lib/printers/bambu";
import { DEFAULT_FILAMENT } from "../lib/mass";

// Settings of the Bambu Studio project a 3MF becomes (ADR 0023).

describe("bambuSettings", () => {
  it("gives the presets of a P1S, its nozzle and the Bambu PLA, on its Textured PEI Plate", async () => {
    const settings = await bambuSettings({ printer: "bambu-p1s", nozzle: 0.4, filament: "pla" }, 0.2);
    expect(settings).toMatchObject({
      printer_model: "Bambu Lab P1S",
      printer_settings_id: "Bambu Lab P1S 0.4 nozzle",
      print_settings_id: "0.20mm Standard @BBL X1C",
      filament_settings_id: ["Bambu PLA Basic @BBL P1S 0.4 nozzle"],
      curr_bed_type: "Textured PEI Plate",
      printable_area: ["0x0", "256x0", "256x256", "0x256"],
      layer_height: "0.2",
      different_settings_to_system: ["", "", ""],
    });
    // The full settings, start G-code included, as Bambu Studio writes them.
    expect(String(settings?.machine_start_gcode).length).toBeGreaterThan(1000);
  });

  it("takes the preset of the filament and of the nozzle", async () => {
    const petg = await bambuSettings({ printer: "bambu-p1s", nozzle: 0.4, filament: "petg" }, 0.2);
    expect(petg?.filament_settings_id).toEqual(["Bambu PETG HF @BBL P1S 0.4 nozzle"]);
    expect(petg?.filament_type).toEqual(["PETG"]);
    const fine = await bambuSettings({ printer: "bambu-p1s", nozzle: 0.2, filament: "pla" }, 0.12);
    expect(fine?.printer_settings_id).toBe("Bambu Lab P1S 0.2 nozzle");
  });

  it("keeps the layer height of the print, marked as changed from the process", async () => {
    const settings = await bambuSettings({ printer: "bambu-p1s", nozzle: 0.4, filament: "pla" }, 0.12);
    expect(settings?.layer_height).toBe("0.12");
    expect(settings?.different_settings_to_system).toEqual(["layer_height", "", ""]);
  });

  it("has no project for a filament Bambu has no preset of for the nozzle", async () => {
    expect(await bambuSettings({ printer: "bambu-p1s", nozzle: 0.2, filament: "tpu" }, 0.2)).toBeNull();
  });
});

describe("bambuTargetOf", () => {
  it("asks for a project only for a Bambu Lab printer", () => {
    expect(bambuTargetOf({ printer: "other", nozzle: 0.4, filament: DEFAULT_FILAMENT })).toBeNull();
    expect(bambuTargetOf({ printer: "bambu-p1s", nozzle: 0.6, filament: { ...DEFAULT_FILAMENT, filament: "petg" } })).toEqual({
      printer: "bambu-p1s",
      nozzle: 0.6,
      filament: "petg",
    });
  });
});
