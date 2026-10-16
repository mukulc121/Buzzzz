export function download(name: string, data: unknown) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  a.download = name;
  // Attached + revoked later: Safari/Arc cancel the save if the URL dies in the same tick.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

export const toBase64 = (buf: ArrayBuffer) => {
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
