
# 🌳 Verificador de Contratistas PNN

Aplicación profesional para el control y seguimiento documental de contratistas de Parques Nacionales Naturales de Colombia.

## 🚀 Guía para el Primer Push (Despliegue)

Si ya tienes tu repositorio creado en GitHub (vacío), abre una terminal en la carpeta de este proyecto y ejecuta estos comandos uno por uno:

1. **Inicializar Git**:
   ```bash
   git init
   ```

2. **Añadir todos los archivos**:
   *(Importante: Esto incluirá la carpeta oculta `.github`)*
   ```bash
   git add .
   ```

3. **Crear el primer registro**:
   ```bash
   git commit -m "Primer despliegue: Sistema de verificación PNN"
   ```

4. **Asegurar la rama principal**:
   ```bash
   git branch -M main
   ```

5. **Vincular a tu GitHub**:
   *(Reemplaza `TU_USUARIO` y `TU_REPOSITORIO` con tus datos reales)*
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   ```

6. **Subir los archivos**:
   ```bash
   git push -u origin main
   ```

## ⚙️ Configuración en GitHub (Pestaña Settings)

Una vez que hayas hecho el push, ve a tu repositorio en la web de GitHub:

1. **Activar Permisos de Escritura**:
   * Ve a **Settings > Actions > General**.
   * En **Workflow permissions**, selecciona **"Read and write permissions"** y guarda los cambios.
   
2. **Configurar la Fuente de Pages**:
   * Ve a **Settings > Pages**.
   * En **Build and deployment > Source**, selecciona **"GitHub Actions"**.

3. **Ver el Progreso**:
   * Haz clic en la pestaña **Actions** arriba. Allí debería aparecer el proceso de construcción en color amarillo/azul.

## 🛠️ Desarrollo Local

```bash
npm install
npm run dev
```

## 💾 Seguridad de Datos
Los datos se almacenan en el navegador (`localStorage`). Usa el botón **Exportar** para respaldar tu trabajo.
