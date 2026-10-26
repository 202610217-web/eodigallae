/**
 * 글자를 클립보드에 복사하고, 성공하면 true를 돌려준다.
 * navigator.clipboard는 보안 연결(https, localhost)에서만 있어서 http://<PC IP>:3000 으로 열면 없다.
 * 그럴 때는 화면에 안 보이는 입력칸을 선택해 복사하는 예전 방식(execCommand)으로 복사한다.
 */
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 권한·포커스 문제로 거절되면 아래 방식으로 한 번 더 시도한다
    }
  }

  const prevFocus = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.setAttribute("aria-hidden", "true");
  area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length); // iOS Safari는 select()만으로는 선택되지 않는다
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  prevFocus?.focus?.();
  return ok;
}
