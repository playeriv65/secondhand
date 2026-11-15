export const sessionFlag = "secondhand-editor";

export function show(status, text) {
  status.textContent = text;
  status.hidden = !text;
}

export async function request(path, options) {
  const res = await fetch(`/api/catalog/${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error ??
        (res.status === 429
          ? "尝试次数过多，请稍后再试。"
          : "操作失败，请稍后再试。"),
    );
  }
  return data;
}
