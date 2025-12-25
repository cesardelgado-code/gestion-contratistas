# 🌳 Verificador de Contratistas PNN

Aplicación profesional para el control y seguimiento documental de contratistas de Parques Nacionales Naturales de Colombia.

## 🚀 Guía para el Primer Push (Despliegue)

1. **Inicializar Git**: `git init`
2. **Añadir archivos**: `git add .`
3. **Commit**: `git commit -m "Despliegue inicial"`
4. **Rama**: `git branch -M main`
5. **Remoto**: `git remote add origin TU_URL_DE_GITHUB`
6. **Push**: `git push -u origin main`

## 🔴 ¿El Workflow falló? (Guía de Depuración)

Si ves una X roja en la pestaña **Actions**, sigue estos pasos:

1. **Ver el error real**: Haz clic en el nombre del workflow fallido ("Despliegue inicial") -> Haz clic en el trabajo **"build"** a la izquierda -> Abre la sección **"Run npm run build"**. Allí dirá exactamente qué falló.
2. **Causa común: Permisos**: Ve a `Settings > Actions > General`. Baja hasta **Workflow permissions** y asegúrate de que esté seleccionado **"Read and write permissions"**.
3. **Causa común: Pages Source**: Ve a `Settings > Pages`. En **Source**, debe decir **"GitHub Actions"**.
4. **Causa común: Case Sensitivity**: Git es sensible a mayúsculas. Asegúrate de que el nombre de los archivos en el código coincida exactamente con el nombre real (ej: `App.tsx` vs `app.tsx`).

## ⚙️ Configuración Requerida

Es vital que en la pestaña **Settings > Pages** de tu repositorio, la fuente (Source) esté configurada como **"GitHub Actions"** para que el script pueda publicar la carpeta `dist`.

## 💾 Seguridad de Datos
Los datos se almacenan en el navegador (`localStorage`). Usa el botón **Exportar** para respaldar tu trabajo.
