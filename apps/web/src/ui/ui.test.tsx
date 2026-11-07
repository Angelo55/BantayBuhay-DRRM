import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChoiceCard, ChoiceGroup, Field, Input, Rail, SegmentedControl, SwipeToConfirm } from "./index";

afterEach(cleanup);

describe("SwipeToConfirm", () => {
  it("confirms once with the tap alternative", () => {
    const onConfirm = vi.fn();
    render(<SwipeToConfirm label="Dispatch" doneLabel="Dispatched" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Dispatch without swiping" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Dispatched" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dispatch without swiping" })).toBeNull();
  });

  it("confirms from the keyboard with Enter on the handle", () => {
    const onConfirm = vi.fn();
    render(<SwipeToConfirm label="Dispatch" doneLabel="Dispatched" onConfirm={onConfirm} />);

    fireEvent.keyDown(screen.getByRole("button", { name: /Drag to the end/ }), { key: "Enter" });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", () => {
    const onConfirm = vi.fn();
    render(<SwipeToConfirm label="Dispatch" doneLabel="Dispatched" onConfirm={onConfirm} disabled />);

    fireEvent.click(screen.getByRole("button", { name: "Dispatch without swiping" }));
    fireEvent.keyDown(screen.getByRole("button", { name: /Drag to the end/ }), { key: "Enter" });

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("Field", () => {
  it("connects the label, hint and error to the control", () => {
    render(
      <Field label="Barangay" hint="Where it's happening" error="Choose a barangay">
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} />}
      </Field>,
    );

    const input = screen.getByLabelText("Barangay");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = input.getAttribute("aria-describedby")!.split(" ");
    expect(described.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "Where it's happening",
      "Choose a barangay",
    ]);
  });
});

describe("SegmentedControl", () => {
  function Harness() {
    const [value, setValue] = useState<"queue" | "map">("queue");
    return (
      <SegmentedControl
        label="View"
        value={value}
        onChange={setValue}
        options={[
          { value: "queue", label: "Incidents" },
          { value: "map", label: "Map" },
        ]}
      />
    );
  }

  it("moves the choice with the arrow keys", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "View" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Map" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("Rail", () => {
  it("marks the current section for assistive technology", () => {
    render(
      <Rail
        label="Main"
        activeId="map"
        onSelect={() => {}}
        items={[
          { id: "incidents", label: "Incidents", icon: null },
          { id: "map", label: "Map", icon: null },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Map" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Incidents" }).getAttribute("aria-current")).toBeNull();
  });
});

describe("ChoiceCard", () => {
  it("is a real radio named by its card text", () => {
    function Picker() {
      const [value, setValue] = useState("low");
      return (
        <ChoiceGroup legend="Severity">
          {["low", "high"].map((level) => (
            <ChoiceCard key={level} name="severity" value={level} checked={value === level} onChange={() => setValue(level)}>
              {level === "low" ? "Low" : "High"}
            </ChoiceCard>
          ))}
        </ChoiceGroup>
      );
    }
    render(<Picker />);

    const high = screen.getByRole("radio", { name: "High" }) as HTMLInputElement;
    fireEvent.click(high);

    expect(high.checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Low" }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole("group", { name: "Severity" })).toBeTruthy();
  });
});
