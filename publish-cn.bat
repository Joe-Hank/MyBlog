@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   发布国内站  Notion  --^>  joecloud.asia
echo ============================================
echo.
echo [1/2] 从 Notion 拉取并生成内容...
node scripts\build-cn.mjs
if errorlevel 1 goto err
echo.
echo [2/2] 上传 OSS + 刷新 CDN...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-oss.ps1"
if errorlevel 1 goto err
echo.
echo ============================================
echo   完成:  https://joecloud.asia/
echo ============================================
pause
exit /b 0
:err
echo.
echo *** 出错了：把上面的报错信息发给 Claude ***
pause
exit /b 1
