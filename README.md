# Extrator de Notícias Windows Portable V1.25.9

Versão Windows Portable do Extrator de Notícias.

## Build automático
O projeto utiliza GitHub Actions para gerar o pacote portátil para Windows.

### Como gerar
1. Abra a aba **Actions** do repositório.
2. Execute o workflow **Build Windows Portable**.
3. Ao finalizar, baixe o artefato `ExtratorNoticias-Windows-Portable-V1.25.9`.

## Estrutura
- `extrator_noticias.py`: aplicativo principal.
- `requirements.txt`: dependências Python.
- `build.bat`: build local opcional.
- `.github/workflows/build-windows.yml`: build automático no GitHub Actions.
