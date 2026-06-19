# AiInterviewPracticeAssistant

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

src/
│
├── app/
│   │
│   ├── core/
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   ├── auth.service.ts
│   │   │   └── storage.service.ts
│   │   │
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── models/
│   │   ├── constants/
│   │   └── config/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── directives/
│   │   ├── pipes/
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── auth/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── models/
│   │   └── routes.ts
│   │
│   ├── dashboard/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── models/
│   │   └── routes.ts
│   │
│   ├── interview/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── models/
│   │   ├── store/
│   │   └── routes.ts
│   │
│   ├── question-bank/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── models/
│   │   └── routes.ts
│   │
│   ├── reports/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── routes.ts
│   │
│   ├── users/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── routes.ts
│   │
│   ├── layouts/
│   │   ├── main-layout/
│   │   ├── auth-layout/
│   │   └── admin-layout/
│   │
│   ├── app.routes.ts
│   ├── app.config.ts
│   └── app.component.ts
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── mock-data/
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
└── styles/
    ├── _variables.scss
    ├── _mixins.scss
    ├── _theme.scss
    └── styles.scss