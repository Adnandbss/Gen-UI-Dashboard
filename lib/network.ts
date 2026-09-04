import os from "node:os";

/** Hostnames the current machine is reachable on, excluding loopback. */
export function localNetworkHosts(): string[] {
  try {
    const hosts = new Set<string>();

    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.internal) continue;
        hosts.add(address.address);
      }
    }

    return [...hosts];
  } catch {
    // Some sandboxes and CI images block uv_interface_addresses. Dev-origin
    // allowlisting is optional — localhost still works without it.
    return [];
  }
}
