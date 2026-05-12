describe('PR-E2E-01: Página de Inicio', () => {
  it('Debe cargar la página de inicio correctamente', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site')
    cy.contains('Carmen Alto').should('exist')
    cy.contains('Trámites').should('exist')
  })
})

describe('PR-E2E-02: Portal Ciudadano - Selección de Trámite', () => {
  it('Debe cargar el portal y mostrar los trámites disponibles', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/portal')
    cy.contains('¿Qué trámite').should('exist')
  })

  it('Debe mostrar tarjetas de trámites', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/portal')
    cy.get('.p1-card').should('have.length.greaterThan', 0)
  })

  it('Debe seleccionar un trámite y mostrar requisitos', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/portal')
    cy.get('.p1-card').first().click()
    cy.contains('Continuar').should('exist')
  })

  it('Debe avanzar al paso 2 al continuar', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/portal')
    cy.get('.p1-card').first().click()
    cy.contains('Continuar').click()
    cy.contains('datos personales').should('exist')
  })
})

describe('PR-E2E-03: Portal Ciudadano - Consulta de Expediente', () => {
  it('Debe cargar la página de consulta', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/consulta')
    cy.url().should('include', '/consulta')
  })
})

describe('PR-E2E-04: Sistema Interno - Login', () => {
  it('Debe cargar la página de login', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/login')
    cy.url().should('include', '/login')
  })

  it('Debe mostrar error con credenciales incorrectas', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/login')
    cy.get('input[type="email"]').type('falso@test.com')
    cy.get('input[type="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()
    cy.wait(3000)
    cy.get('body').should('not.include.text', 'dashboard')
    cy.url().should('include', '/login')
  })

  it('Debe iniciar sesión correctamente con admin', () => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/login')
    cy.get('input[type="email"]').type('admin@carmenalto.gob.pe')
    cy.get('input[type="password"]').type('123456')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
  })
})

describe('PR-E2E-05: Sistema Interno - Dashboard Admin', () => {
  beforeEach(() => {
    cy.viewport(1280, 720)
    cy.visit('https://municipalidadcarmenalto.site/login')
    cy.get('input[type="email"]').type('admin@carmenalto.gob.pe')
    cy.get('input[type="password"]').type('123456')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
  })

 it('Debe mostrar el dashboard con KPIs', () => {
  cy.wait(4000)
  cy.get('h1').should('exist')
})

  it('Debe mostrar el menú de navegación lateral', () => {
    cy.get('aside').should('exist')
    cy.get('nav').should('exist')
  })
})