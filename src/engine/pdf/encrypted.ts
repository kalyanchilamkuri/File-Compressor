/**
 * Its own module so that tools which only need the check — merging, for instance — don't pull in
 * ./compress and, through it, the whole pdf.js rendering chunk.
 */
export const isEncrypted = (bytes: Uint8Array) => {
  // The trailer (last few KB) names the encryption dictionary if there is one.
  const tail = new TextDecoder('latin1').decode(bytes.subarray(Math.max(0, bytes.length - 4096)));
  return /\/Encrypt\s/.test(tail);
};
