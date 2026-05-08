import type { AxiosResponse } from "axios";
import { sendRequest } from "@/utils/api";

const BARE_GETDATA_PATH = "/ajax_vue/ajax/getData.php";

/** Параллельные вызовы без query-параметров сливаются в один HTTP-запрос. */
let inFlight: Promise<AxiosResponse<Record<string, unknown>>> | null = null;

export function fetchSharedCabinetGetData(): Promise<
  AxiosResponse<Record<string, unknown>>
> {
  if (!inFlight) {
    inFlight = sendRequest("get", BARE_GETDATA_PATH, {}).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
