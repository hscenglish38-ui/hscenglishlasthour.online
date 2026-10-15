import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderForm } from "./OrderForm";
import { BookProvider } from "@/components/book/BookProvider";
import { realBookConfig } from "@/lib/book/config";

function renderForm() {
  return render(
    <BookProvider initialBook={realBookConfig}>
      <OrderForm />
    </BookProvider>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/Name/i), "Ayesha Rahman");
  await userEvent.type(screen.getByLabelText(/Mobile Number/i), "01712345678");
  await userEvent.type(screen.getByLabelText(/Address/i), "House 12, Road 5, Dhanmondi");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OrderForm", () => {
  it("shows the price breakdown and a Place Order button", () => {
    renderForm();
    expect(screen.getByText("Price per Book")).toBeInTheDocument();
    expect(screen.getByText("Quantity")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Delivery Charge")).toBeInTheDocument();
    expect(screen.getByText("Total Price")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /place order/i })).toBeInTheDocument();
  });

  it("uses the corrected সর্বমোট / Subtotal label and never the old উপমোট", () => {
    renderForm();
    expect(screen.getByText("সর্বমোট")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.queryByText("উপমোট")).not.toBeInTheDocument();
    expect(screen.queryByText(/উপমোট/)).not.toBeInTheDocument();
  });

  it("removes the Bangladeshi mobile number hint label but keeps the phone field", () => {
    renderForm();
    expect(screen.queryByText("বাংলাদেশি মোবাইল নম্বর")).not.toBeInTheDocument();
    expect(screen.queryByText("Bangladeshi mobile number")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
  });

  it("defaults the quantity to 1 and recalculates the total when changed", async () => {
    renderForm();
    const group = screen.getByRole("group", { name: /Book Quantity/i });
    expect(group).toHaveTextContent("1");
    expect(screen.getByText("৳410")).toBeInTheDocument();

    const increase = screen.getByRole("button", { name: /Increase quantity/i });
    await userEvent.click(increase);
    await userEvent.click(increase);
    await userEvent.click(increase);

    expect(group).toHaveTextContent("4");
    expect(screen.getByText("৳1,460")).toBeInTheDocument();
    expect(screen.getByText("৳1,400")).toBeInTheDocument();
  });

  it("sends the selected quantity to the server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          orderId: "abc123",
          book: { id: "hscenglishlasthour", title: "HSC English Last Hour" },
          pricing: {
            unitPrice: 350,
            quantity: 2,
            subtotal: 700,
            deliveryCharge: 60,
            totalAmount: 760,
          },
          message: "Your order has been received.",
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /Increase quantity/i }));
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument();
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body).quantity).toBe(2);
  });

  it("validates required fields before submitting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/enter your full name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your mobile number/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your delivery address/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits a valid order and shows the confirmation from the server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          orderId: "abc123",
          book: { id: "sample-book-001", title: "Sample Book" },
          pricing: { unitPrice: 350, quantity: 1, subtotal: 350, deliveryCharge: 60, totalAmount: 410 },
          message: "Your order has been received.",
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(JSON.parse(options.body)).toEqual({
      customerName: "Ayesha Rahman",
      customerPhone: "+8801712345678",
      customerAddress: "House 12, Road 5, Dhanmondi",
      quantity: 1,
    });
  });

  it("shows a server error without clearing the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: "Supabase is not configured on the server." }, 503),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not configured/i);
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/i)).toHaveValue("Ayesha Rahman");
    });
  });

  it("sends only one request for a duplicate (double) submission", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await fillValidForm();
    const button = screen.getByRole("button", { name: /place order/i });

    await userEvent.click(button);
    expect(screen.getByRole("button", { name: /placing order/i })).toBeDisabled();
    await userEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(
      jsonResponse(
        {
          orderId: "abc123",
          book: { id: "sample-book-001", title: "Sample Book" },
          pricing: { unitPrice: 350, quantity: 1, subtotal: 350, deliveryCharge: 60, totalAmount: 410 },
          message: "Your order has been received.",
        },
        201,
      ),
    );

    expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument();
  });

  it("renders the address as a fixed-height, non-resizable textarea", () => {
    renderForm();
    const address = screen.getByLabelText(/Address/i) as HTMLTextAreaElement;
    expect(address.tagName).toBe("TEXTAREA");
    expect(address).toHaveAttribute("rows", "3");
    expect(address.className).toContain("address-input");
    expect(address.className).not.toContain("resize-y");
  });

  it("keeps at most three lines when a longer address is pasted", async () => {
    renderForm();
    const address = screen.getByLabelText(/Address/i) as HTMLTextAreaElement;
    await userEvent.click(address);
    await userEvent.paste("Line 1\nLine 2\nLine 3\nLine 4\nLine 5");
    expect(address.value).toBe("Line 1\nLine 2\nLine 3");
    expect(address.value.split("\n")).toHaveLength(3);
  });

  it("collapses consecutive newlines so blank lines cannot bypass the limit", async () => {
    renderForm();
    const address = screen.getByLabelText(/Address/i) as HTMLTextAreaElement;
    await userEvent.click(address);
    await userEvent.paste("House 12\n\n\n\nRoad 5, Dhanmondi");
    expect(address.value).toBe("House 12\nRoad 5, Dhanmondi");
  });

  it("never lets a fourth line be entered by typing", async () => {
    renderForm();
    const address = screen.getByLabelText(/Address/i) as HTMLTextAreaElement;
    await userEvent.click(address);
    await userEvent.type(address, "L1{enter}L2{enter}L3{enter}L4");
    expect(address.value.split("\n").length).toBeLessThanOrEqual(3);
  });
});
