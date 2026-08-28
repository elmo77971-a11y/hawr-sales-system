!macro customInstall
  ; كل تشغيل لمثبت Windows يبدأ ببيانات محلية جديدة. النسخ الاحتياطية الخارجية لا تقع داخل هذه المسارات.
  RMDir /r "$APPDATA\hawr-sales-system"
  RMDir /r "$LOCALAPPDATA\hawr-sales-system"
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Hawr Gallery LAN" dir=in action=allow protocol=TCP localport=3688-3707 profile=private'
  nsExec::ExecToLog 'schtasks /Create /SC DAILY /TN "Hawr Gallery Daily Backup" /TR "\"$INSTDIR\HawrGallery.exe\" --daily-backup" /ST 23:00 /F'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'schtasks /Delete /TN "Hawr Gallery Daily Backup" /F'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Hawr Gallery LAN"'
!macroend
