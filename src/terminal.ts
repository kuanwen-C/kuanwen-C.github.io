/**
 * The hero terminal. It is a shortcut, not a gate: every command that
 * navigates simply scrolls to a normal section further down the page.
 */

type LineClass = "cmd" | "dim" | "ok" | "err" | "hl" | "";
type Handler = (args: string[]) => void | Promise<void>;

const SECTIONS: Record<string, string> = {
  about: "about",
  intro: "about",
  education: "education",
  work: "work",
  experience: "work",
  projects: "projects",
  skills: "skills",
  "looking-for": "looking-for",
  life: "life",
  hobbies: "life",
  contact: "contact",
};

const SECTION_NAMES = ["about", "education", "work", "projects", "skills", "looking-for", "life", "contact"];

export function initTerminal(): void {
  const out = document.getElementById("term-out");
  const input = document.getElementById("term-in") as HTMLInputElement | null;
  const box = document.getElementById("terminal");
  if (!out || !input || !box) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const history: string[] = [];
  let cursor = 0;

  function print(text: string, cls: LineClass = ""): HTMLDivElement {
    const line = document.createElement("div");
    if (cls) line.className = cls;
    line.textContent = text; // textContent only — typed input is never parsed as HTML
    out!.appendChild(line);
    out!.scrollTop = out!.scrollHeight;
    return line;
  }

  function go(target: string): boolean {
    const id = SECTIONS[target.replace(/^[~./]+|\/+$|\.(txt|md)$/g, "")];
    const el = id ? document.getElementById(id) : null;
    if (!el) return false;
    print(`→ navigating to ~/${id} …`, "hl");
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    el.classList.remove("flash");
    void el.offsetWidth; // restart the highlight animation
    el.classList.add("flash");
    return true;
  }

  const commands: Record<string, Handler> = {
    help() {
      print("Jump to a section:", "dim");
      print("  about · education · work · projects · skills");
      print("  looking-for · life · contact");
      print("Quick info:", "dim");
      print("  whoami · resume · ls · history · clear");
      print("Tip: Tab completes, ↑/↓ recalls. There may be a few easter eggs.", "dim");
    },
    whoami() {
      print("Steven (Kuan-Wen) Chen", "hl");
      print("Software Engineering master's student, CMU School of Computer Science.");
      print("Built: cloud infrastructure, ML inference optimization, ETL data pipelines.");
      print("Also: forecasting and anomaly-detection models for advertising data.");
      print("Seeking: a Summer 2027 software engineering internship.");
    },
    skills() {
      print("languages  Python · C/C++ · SQL · Go · MATLAB · 8051 assembly");
      print("cloud      AWS · Infrastructure as Code (CDK) · CI/CD · Docker");
      print("ml/infra   PyTorch · inference optimization · Neuron SDK · TensorRT");
      print("backend    Django · REST APIs      data  ETL · statistics · forecasting");
      go("skills");
    },
    ls() {
      print(SECTION_NAMES.map((s) => `${s}/`).join("   "), "hl");
    },
    pwd() {
      print("/home/steven/portfolio");
    },
    cd(args) {
      const target = args[0];
      if (!target || target === "~") {
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        return;
      }
      if (!go(target)) print(`cd: no such directory: ${target}`, "err");
    },
    cat(args) {
      const target = args[0];
      if (!target) return print("usage: cat <section>", "dim"), undefined;
      if (!go(target)) print(`cat: ${target}: No such file or directory`, "err");
    },
    open(args) {
      return commands.cat(args);
    },
    async resume() {
      if (await resumeExists()) {
        print("Opening resume.pdf …", "ok");
        window.open("resume.pdf", "_blank", "noopener");
      } else {
        print("resume.pdf isn't uploaded yet — LinkedIn has the same details:", "dim");
        print("https://www.linkedin.com/in/kuanwenc/", "hl");
      }
    },
    history() {
      history.forEach((h, i) => print(`${String(i + 1).padStart(3)}  ${h}`));
    },
    clear() {
      out.replaceChildren();
    },
    echo(args) {
      print(args.join(" "));
    },
    date() {
      print(new Date().toString());
    },
    sudo(args) {
      if (args.join(" ").replace(/\s+/g, "-").startsWith("hire")) {
        print("[sudo] password for host: ********", "dim");
        print("Permission granted. Good call.", "ok");
        go("contact");
      } else {
        print("steven is not in the sudoers file. This incident will be reported.", "err");
      }
    },
    exit() {
      print("There is no escape — but here's a way out:", "dim");
      go("contact");
    },
    vim() {
      print("Nice try. You'd never get out again.", "dim");
    },
    coffee() {
      print("☕ Brewing… this whole page is coffee-coloured for a reason.", "hl");
    },
  };
  commands.vi = commands.vim;
  commands.emacs = commands.vim;

  async function run(raw: string, echo = true): Promise<void> {
    box!.classList.remove("attention");
    const text = raw.trim();
    if (echo) print(text, "cmd");
    if (!text) return;
    history.push(text);
    cursor = history.length;

    const [name, ...args] = text.split(/\s+/);
    const key = name.toLowerCase();
    if (commands[key]) {
      await commands[key](args);
    } else if (!go(key)) {
      print(`zsh: command not found: ${name}`, "err");
      print("Type 'help' to see what works.", "dim");
    }
  }

  function complete(): void {
    const value = input!.value;
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase();
    if (!last) return;
    const pool = parts.length > 1 ? SECTION_NAMES : [...new Set([...Object.keys(commands), ...Object.keys(SECTIONS)])];
    const matches = pool.filter((c) => c.startsWith(last)).sort();
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      input!.value = parts.join(" ");
    } else if (matches.length > 1) {
      print(value, "cmd");
      print(matches.join("   "), "dim");
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = input.value;
      input.value = "";
      void run(value);
    } else if (e.key === "Tab") {
      if (input.value) {
        e.preventDefault();
        complete();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cursor > 0) input.value = history[--cursor];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] ?? "";
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      out.replaceChildren();
    }
  });

  // Clicking anywhere in the window focuses the prompt, unless text is being selected
  box.addEventListener("click", () => {
    if (!window.getSelection()?.toString()) input.focus({ preventScroll: true });
  });
  input.addEventListener("input", () => box.classList.remove("attention"), { once: true });

  // Clickable commands: same effect as typing them
  document.querySelectorAll<HTMLButtonElement>(".chips button").forEach((button) => {
    button.addEventListener("click", () => void run(button.dataset.cmd ?? ""));
  });

  // "/" jumps to the terminal from anywhere on the page.
  // The physical key (e.code) is checked as well as the character, because with a
  // Chinese/Japanese input method switched on the browser reports the key as
  // "Process" (or a phonetic symbol) rather than "/".
  let slashPending = false;
  const isSlash = (e: KeyboardEvent) => e.code === "Slash" || e.key === "/";

  document.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    if (!isSlash(e) || typing || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    slashPending = true;
  });

  // Focus on key release: by then an input method has finished with this keystroke,
  // so it cannot leak a stray character into the prompt.
  document.addEventListener("keyup", (e) => {
    if (!slashPending || !isSlash(e)) return;
    slashPending = false;
    box.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    input.focus({ preventScroll: true });
    box.classList.add("attention"); // pulse the frame so the jump is noticeable
  });

  void intro();

  /** Types `whoami` by itself on load so first-time visitors see how it works. */
  async function intro(): Promise<void> {
    const command = "whoami";
    if (reduced) {
      print(command, "cmd");
    } else {
      const line = print("", "cmd");
      line.classList.add("caret");
      await sleep(650);
      for (const ch of command) {
        line.textContent += ch;
        await sleep(85);
      }
      await sleep(320);
      line.classList.remove("caret");
    }
    commands.whoami([]);
    print("↓ Your turn. Type 'help' and press Enter, or click a command below.", "ok");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let resumeCheck: Promise<boolean> | undefined;

/** True only if resume.pdf is really a PDF (dev servers answer 200 with HTML for missing files). */
export function resumeExists(): Promise<boolean> {
  resumeCheck ??= fetch("resume.pdf", { method: "HEAD" })
    .then((res) => res.ok && (res.headers.get("content-type") ?? "").includes("pdf"))
    .catch(() => false);
  return resumeCheck;
}
