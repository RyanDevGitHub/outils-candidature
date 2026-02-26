# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e3]:
    - heading "Créer un compte" [level=1] [ref=e4]
    - paragraph [ref=e5]: Authentification passwordless par e-mail (code) ou OAuth Google.
    - generic "Connexion avec un réseau social" [ref=e6]:
      - button "Continuer avec Google" [ref=e7] [cursor=pointer]:
        - generic [ref=e8]: G
        - text: Continuer avec Google
    - generic [ref=e9]:
      - group "Inscription par e-mail" [ref=e10]:
        - generic [ref=e11]: Inscription par e-mail
        - generic [ref=e12]: Nom complet
        - textbox "Nom complet" [ref=e13]:
          - /placeholder: Votre nom complet
        - generic [ref=e14]: E-mail
        - textbox "E-mail" [ref=e15]:
          - /placeholder: Votre adresse e-mail
      - button "Envoyer un code de vérification" [ref=e16] [cursor=pointer]
    - paragraph [ref=e17]:
      - text: Vous avez déjà un compte ?
      - link "Se connecter" [ref=e18] [cursor=pointer]:
        - /url: login.html
    - paragraph [ref=e19]
```