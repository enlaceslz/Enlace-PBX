#!/usr/bin/env bash
# Homologation diagnostic bundle: read-only probes; never authorizes production.
set -Eeuo pipefail
export LC_ALL=C
umask 077
if [ "$#" -ne 1 ]; then echo "Uso: $0 DIRETORIO_NOVO" >&2; exit 2; fi
target="$1"
[ -n "$target" ] && [ "$target" != "/" ] || exit 2
if [ -e "$target" ] || [ -L "$target" ]; then
  echo "ERRO: destino existente." >&2
  exit 2
fi
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mkdir -m 700 -- "$target"
status=0
if bash "$script_dir/preflight-homologacao.sh" --report "$target/preflight.txt"; then
  printf 'OK preflight\n'
else
  printf 'FALHA preflight\n' >&2
  status=1
fi
if bash "$script_dir/inventory-homologation-isolation.sh" "$target/rotas"; then
  printf 'OK inventario de rotas (nao comprova isolamento)\n'
else
  printf 'FALHA inventario de rotas\n' >&2
  status=1
fi
if bash "$script_dir/collect-asterisk-evidence.sh" "$target/asterisk"; then
  printf 'OK coletor Asterisk\n'
else
  printf 'FALHA coletor Asterisk\n' >&2
  status=1
fi
printf 'resultado=%s\nisolamento=NAO CONFIRMADO\nhomologacao=NAO EXECUTADA\n' "$status" > "$target/RESUMO.txt"
(
  cd "$target"
  find . -type f ! -path './SHA256SUMS' -print0 | sort -z | xargs -0 -r sha256sum > SHA256SUMS
)
echo "Diagnosticos concluidos; validar isolamento e TEL-01 a TEL-10 manualmente."
exit "$status"
