export function download(name: string, data: unknown) {
  downloadBlob(name, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}

export function downloadBlob(name: string, data: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(data);
  a.download = name;
  // Attached + revoked later: Safari/Arc cancel the save if the URL dies in the same tick.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
