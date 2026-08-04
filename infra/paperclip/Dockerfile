# Rozšíření oficiálního Paperclip image o Google Gemini CLI (adaptér `gemini_local`).
# Základní image lze přepsat build-argem PAPERCLIP_IMAGE (pin na konkrétní tag doporučený).

ARG PAPERCLIP_IMAGE=ghcr.io/paperclipai/paperclip:latest
FROM ${PAPERCLIP_IMAGE}

USER root
RUN npm install --global --omit=dev @google/gemini-cli@latest \
  && command -v gemini >/dev/null

# Headless / Docker: důvěřovat workspace bez promptu (viz Gemini CLI trusted-folders).
ENV GEMINI_CLI_TRUST_WORKSPACE=true
