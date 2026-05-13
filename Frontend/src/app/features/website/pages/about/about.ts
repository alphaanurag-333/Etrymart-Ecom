import { Component } from '@angular/core';

@Component({
  selector: 'app-about-page',
  template: `
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-8">
          <div class="card shadow-sm border-0 rounded-4 p-4 p-md-5">
            <h1 class="heading-1">About EtryMart</h1>
            <p class="text-muted mt-3 mb-0">
              This public site shares the same design tokens as the admin and seller consoles so
              every surface feels cohesive. Replace this copy with your brand story, policies, and
              value props.
            </p>
            <ul class="list-check mt-4 mb-0">
              <li>Standalone Angular 21 components</li>
              <li>Lazy routes per area</li>
              <li>Guards ready for real auth tokens</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AboutPage {}
