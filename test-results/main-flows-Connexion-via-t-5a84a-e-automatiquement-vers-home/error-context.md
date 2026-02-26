# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e3]:
    - heading "Connexion" [level=1] [ref=e4]
    - paragraph [ref=e5]: Connectez-vous avec votre e-mail (code de vérification) ou avec Google.
    - generic "Connexion avec un réseau social" [ref=e6]:
      - button "Continuer avec Google" [ref=e7] [cursor=pointer]:
        - generic [ref=e8]: G
        - text: Continuer avec Google
    - generic [ref=e9]:
      - group "Connexion par e-mail" [ref=e10]:
        - generic [ref=e11]: Connexion par e-mail
        - generic [ref=e12]: E-mail
        - textbox "E-mail" [ref=e13]:
          - /placeholder: Votre adresse e-mail
      - button "Envoyer un code de vérification" [ref=e14] [cursor=pointer]
    - paragraph [ref=e15]:
      - text: Pas encore de compte ?
      - link "Créer un compte" [ref=e16] [cursor=pointer]:
        - /url: index.html
    - paragraph [ref=e17]
```