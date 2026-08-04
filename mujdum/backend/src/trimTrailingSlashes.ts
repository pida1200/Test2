/** Odstraní koncová lomítka bez regexu (Sonar S5852 / ReDoS). */
export function trimTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") {
    end -= 1;
  }
  return url.slice(0, end);
}
