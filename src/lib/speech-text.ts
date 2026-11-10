/** Turns Lumi's markdown + LaTeX answer into text that sounds natural when read aloud in Indonesian. */
export function toSpokenText(input: string): string {
  let s = input;
  const group = String.raw`\{([^{}]*)\}`;
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(new RegExp(String.raw`\\[dt]?frac` + group + group, "g"), " $1 per $2 ")
      .replace(new RegExp(String.raw`\\sqrt` + group, "g"), " akar $1 ")
      .replace(new RegExp(String.raw`\\(?:text|mathrm|mathbf|operatorname|boxed)` + group, "g"), " $1 ");
  }
  s = s
    .replace(/\^\{?2\}?/g, " kuadrat ")
    .replace(/\^\{?3\}?/g, " pangkat tiga ")
    .replace(/\^\{([^{}]*)\}/g, " pangkat $1 ")
    .replace(/\^(\w)/g, " pangkat $1 ")
    .replace(/_\{([^{}]*)\}/g, " $1 ")
    .replace(/_(\w)/g, " $1 ")
    .replace(/\\(times|cdot)/g, " kali ")
    .replace(/\\div/g, " bagi ")
    .replace(/\\pm/g, " plus minus ")
    .replace(/\\(leq|le)\b/g, " kurang dari sama dengan ")
    .replace(/\\(geq|ge)\b/g, " lebih dari sama dengan ")
    .replace(/\\neq/g, " tidak sama dengan ")
    .replace(/\\approx/g, " kira-kira ")
    .replace(/\\(rightarrow|Rightarrow|to)\b/g, " maka ")
    .replace(/\\(pi|alpha|beta|theta|lambda|Delta|delta|omega|rho|mu)/g, " $1 ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\$+/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s=\s|=/g, " sama dengan ")
    .replace(/(\d)\s*\+\s*(\d)/g, "$1 tambah $2")
    .replace(/\s\+\s/g, " tambah ")
    .replace(/(\d)\s*[−-]\s*(\d)/g, "$1 kurang $2")
    .replace(/(\d)\s*[×x*]\s*(\d)/g, "$1 kali $2")
    .replace(/(\d)\s*\/\s*(\d)/g, "$1 per $2")
    .replace(/[*_#`>|~]/g, " ")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n+ */g, "\n")
    .trim();
  return s;
}
