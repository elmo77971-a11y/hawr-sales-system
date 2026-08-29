!include "nsDialogs.nsh"
!include "WinMessages.nsh"

Var InstallMode
Var InstallModeClean
Var InstallModeUpdate

Function InstallModePageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 30u "اختر نوع التثبيت لهذا الإصدار:"
  Pop $0
  ${NSD_CreateRadioButton} 10u 38u 90% 18u "تحديث مع الاحتفاظ ببيانات المبيعات والمخزون (موصى به)"
  Pop $InstallModeUpdate
  ${NSD_CreateRadioButton} 10u 65u 90% 18u "تثبيت نظيف والبدء كأنه أول تشغيل"
  Pop $InstallModeClean
  ${NSD_SetState} $InstallModeUpdate ${BST_CHECKED}
  nsDialogs::Show
FunctionEnd

Function InstallModePageLeave
  ${NSD_GetState} $InstallModeClean $0
  ${If} $0 == ${BST_CHECKED}
    MessageBox MB_ICONEXCLAMATION|MB_YESNO "التثبيت النظيف سيحذف بيانات التطبيق المحلية، ومنها المبيعات والمخزون والحسابات. لن تُحذف ملفات النسخ الاحتياطية الموجودة خارج مجلد التطبيق. هل تريد المتابعة؟" IDYES done
    Abort
    done:
    StrCpy $InstallMode clean
  ${Else}
    StrCpy $InstallMode update
  ${EndIf}
FunctionEnd

Page custom InstallModePageCreate InstallModePageLeave

!macro customInstall
  ; لا تُحذف البيانات إلا إذا اختار المستخدم التثبيت النظيف وأكد التحذير.
  StrCmp $InstallMode clean 0 keepData
  RMDir /r "$APPDATA\hawr-sales-system"
  RMDir /r "$LOCALAPPDATA\hawr-sales-system"
  keepData:
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Hawr Gallery LAN" dir=in action=allow protocol=TCP localport=3688-3707 profile=private'
  nsExec::ExecToLog 'schtasks /Create /SC DAILY /TN "Hawr Gallery Daily Backup" /TR "\"$INSTDIR\HawrGallery.exe\" --daily-backup" /ST 23:00 /F'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'schtasks /Delete /TN "Hawr Gallery Daily Backup" /F'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Hawr Gallery LAN"'
!macroend
