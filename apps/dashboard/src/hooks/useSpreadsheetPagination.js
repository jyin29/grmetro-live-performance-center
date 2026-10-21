import { useEffect, useMemo, useState } from "react";
import pagination from "../../../../shared/spreadsheetPagination.cjs";

const { DEFAULT_SPREADSHEET_DIMENSIONS, paginateSpreadsheetSlide } = pagination;
export function useSpreadsheetPagination(slide, settings, displaySettings) {
  const [dimensions, setDimensions] = useState(DEFAULT_SPREADSHEET_DIMENSIONS);
  useEffect(() => {
    const stage = document.querySelector(".display-stage");
    const update = () => {
      const width = Math.round(stage?.clientWidth || DEFAULT_SPREADSHEET_DIMENSIONS.width);
      const height = Math.round(stage?.clientHeight || DEFAULT_SPREADSHEET_DIMENSIONS.height);
      setDimensions((current) => current.width === width && current.height === height ? current : { width, height });
    };
    const observer = stage && typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(stage); window.addEventListener("resize", update); update();
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  return useMemo(() => paginateSpreadsheetSlide(slide, { dimensions, settings }), [dimensions, displaySettings, settings, slide]);
}
