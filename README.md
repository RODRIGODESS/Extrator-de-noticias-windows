# Extrator de Matérias Windows Portable V1.25.9

Versão Windows Portable construída sobre a estrutura antiga do projeto Electron, preservando o motor de extração V1.25.1 e as funções que já estavam funcionando.

## Estrutura preservada
- `main.js`: aplicação Electron e integração com arquivos/histórico.
- `preload.js`: ponte segura entre interface e processo principal.
- `renderer/`: interface clássica do Extrator de Matérias.
- `engine/extrator-materia-v1.25.1.js`: motor de extração com Mozilla Readability, JSDOM, Undici, proxy corporativo, filtros e correções por portal.
- `engine/config-proxy.json`: configuração de servidor/porta do proxy.
- `package.json`: dependências e geração do EXE portátil.
- `build_windows.bat`: build local.
- `.github/workflows/build-windows.yml`: build automático pelo GitHub Actions.

## Funções mantidas
- Extração de título, subtítulo, autor, data e corpo da matéria.
- Limpeza de publicidade, créditos, recomendações e conteúdos relacionados.
- Tratamentos específicos para diferentes portais.
- Conexão direta ou proxy corporativo.
- Usuário e senha do proxy somente durante a sessão.
- Geração de `materia-extraida.txt`.
- Histórico acumulado sem duplicar URL já registrada.
- Cópia automática do resultado para a área de transferência.
- Botões para abrir último TXT, histórico e pasta.

## Build automático
Abra **Actions > Build Windows Portable V1.25.9 > Run workflow**.

Ao concluir, baixe o artefato `ExtratorNoticias-Windows-Portable-V1.25.9`.
