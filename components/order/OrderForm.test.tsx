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
  await userEvent.type(screen.getByLabelText("Full name"), "Ayesha Rahman");
  await userEvent.type(screen.getByLabelText("Mobile number"), "01712345678");
  await userEvent.type(screen.getByLabelText("Delivery address"), "House 12, Road 5, Dhanmondi");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OrderForm", () => {
  it("shows the price breakdown and an Order Now button", () => {
    renderForm();
    expect(screen.getByText("Book price")).toBeInTheDocument();
    expect(screen.getByText("Delivery charge")).toBeInTheDocument();
    expect(screen.getByText("Total payable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /order now/i })).toBeInTheDocument();
  });

  it("validates required fields before submitting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /order now/i }));

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
          pricing: { bookPrice: 350, deliveryCharge: 60, totalAmount: 410 },
          message: "Your order has been received.",
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /order now/i }));

    expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(JSON.parse(options.body)).toEqual({
      customerName: "Ayesha Rahman",
      customerPhone: "+8801712345678",
      customerAddress: "House 12, Road 5, Dhanmondi",
    });
  });

  it("shows a server error without clearing the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: "Supabase is not configured on the server." }, 503),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /order now/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not configured/i);
    await waitFor(() => {
      expect(screen.getByLabelText("Full name")).toHaveValue("Ayesha Rahman");
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
    const button = screen.getByRole("button", { name: /order now/i });

    await userEvent.click(button);
    expect(screen.getByRole("button", { name: /placing order/i })).toBeDisabled();
    await userEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(
      jsonResponse(
        {
          orderId: "abc123",
          book: { id: "sample-book-001", title: "Sample Book" },
          pricing: { bookPrice: 350, deliveryCharge: 60, totalAmount: 410 },
          message: "Your order has been received.",
        },
        201,
      ),
    );

    expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument();
  });
});
