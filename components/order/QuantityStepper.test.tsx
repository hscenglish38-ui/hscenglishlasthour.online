import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "./QuantityStepper";

describe("QuantityStepper", () => {
  it("renders the current value", () => {
    render(<QuantityStepper value={1} onChange={() => {}} labelledBy="q-label" />);
    expect(screen.getByRole("group")).toHaveTextContent("1");
  });

  it("increases and decreases by one", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QuantityStepper value={5} onChange={onChange} labelledBy="q-label" />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Increase quantity/i }));
    expect(onChange).toHaveBeenLastCalledWith(6);

    await userEvent.click(screen.getByRole("button", { name: /Decrease quantity/i }));
    expect(onChange).toHaveBeenLastCalledWith(4);

    rerender(<QuantityStepper value={6} onChange={onChange} labelledBy="q-label" />);
  });

  it("disables the minus button at the minimum (1)", () => {
    render(<QuantityStepper value={1} onChange={() => {}} labelledBy="q-label" />);
    expect(screen.getByRole("button", { name: /Decrease quantity/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Increase quantity/i })).toBeEnabled();
  });

  it("disables the plus button at the maximum (20)", () => {
    render(<QuantityStepper value={20} onChange={() => {}} labelledBy="q-label" />);
    expect(screen.getByRole("button", { name: /Increase quantity/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Decrease quantity/i })).toBeEnabled();
  });

  it("never emits a value below 1 or above 20 even if clicked out of range", async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} labelledBy="q-label" />);
    expect(screen.getByRole("button", { name: /Decrease quantity/i })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables both buttons while disabled", () => {
    render(<QuantityStepper value={5} onChange={() => {}} labelledBy="q-label" disabled />);
    expect(screen.getByRole("button", { name: /Increase quantity/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Decrease quantity/i })).toBeDisabled();
  });
});
