describe('Authentication Flow', () => {
    it('Should load the login page and show the login form', () => {
        cy.visit('/login')

        // Verify the core semantic landmarks
        cy.get('h1').contains('Welcome Back')
        cy.get('input[type="email"]').should('be.visible')
        cy.get('input[type="password"]').should('be.visible')
        cy.get('button[type="submit"]').contains('Sign In')
    })

    it('Should successfully navigate from the hero landing page to login', () => {
        cy.visit('/')
        cy.get('a[href="/dashboard"]').click()
        // By default, accessing the protected /dashboard without Auth redirects to /login
        cy.url().should('include', '/login')
    })
})
