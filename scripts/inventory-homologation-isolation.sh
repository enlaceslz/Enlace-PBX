#!/usr/bin/env bash
# Read-only isolation inventory; never claims network isolation by itself.
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
command -v ip >/dev/null 2>&1 || { echo "ERRO: comando ip indisponivel." >&2; exit 2; }
mkdir -m 700 -- "$target"
# Do not save raw IP addresses, gateway details or interface names.
# Exit status indicates whether a default route is configured, not its safety.
if ip -4 route show default | grep -q .; then
  printf 'ATENCAO: rota IPv4 padrao presente; isolamento exige verificacao humana.\n' > "$target/rotas.txt"
else
  printf 'OK: nenhuma rota IPv4 padrao identificada.\n' > "$target/rotas.txt"
fi
if ip -6 route show default | grep -q .; then
  printf 'ATENCAO: rota IPv6 padrao presente; isolamento exige verificacao humana.\n' >> "$target/rotas.txt"
else
  printf 'OK: nenhuma rota IPv6 padrao identificada.\n' >> "$target/rotas.txt"
fi
printf 'PENDENTE: revisar troncos SIP, ACLs, NAT, firewall e rotas de operadora manualmente.\n' > "$target/isolamento.txt"
(
  cd "$target"
  sha256sum rotas.txt isolamento.txt > SHA256SUMS
)
printf 'Inventario gerado; isolamento NAO confirmado.\n'
