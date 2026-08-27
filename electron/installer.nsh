!macro customInstall
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Hawr Gallery LAN" dir=in action=allow protocol=TCP localport=3688-3707 profile=private'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Hawr Gallery LAN"'
!macroend
