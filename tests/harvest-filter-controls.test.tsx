// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HarvestFilters } from "@/components/harvest/HarvestFilters";

afterEach(cleanup);

it.each([{ notes: [] }, { notes: ["Project.md"] }])(
  "hides the note filter without multiple notes: $notes",
  ({ notes }) => {
    render(
      <HarvestFilters
        tags={["study"]}
        notes={notes}
        tag=""
        notePath=""
        onTag={vi.fn()}
        onNote={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Filter by note")).toBeNull();
    expect(screen.getByLabelText("Filter by tag")).toBeTruthy();
  },
);

it("offers multiple notes and clears a selection when the filter becomes hidden", () => {
  const onNote = vi.fn();
  const props = { tags: [], tag: "", notePath: "", onTag: vi.fn(), onNote };
  const { rerender } = render(<HarvestFilters {...props} notes={["A.md", "B.md"]} />);
  fireEvent.change(screen.getByLabelText("Filter by note"), { target: { value: "A.md" } });
  expect(onNote).toHaveBeenCalledWith("A.md");
  onNote.mockClear();
  rerender(<HarvestFilters {...props} notes={["A.md"]} notePath="A.md" />);
  expect(screen.queryByLabelText("Filter by note")).toBeNull();
  expect(onNote).toHaveBeenCalledWith("");
});
