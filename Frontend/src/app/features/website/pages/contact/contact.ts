import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-7">
          <div class="card shadow-sm border-0 rounded-4 p-4 p-md-5">
            <h1 class="heading-1">Contact</h1>
            <p class="text-muted mt-2 mb-0">We will route this form to your API when you are ready.</p>

            <form class="form-stack mt-4" [formGroup]="form" (ngSubmit)="submit()">
              <div class="mb-3">
                <label class="form-label" for="c-name">Name</label>
                <input
                  id="c-name"
                  class="form-control"
                  type="text"
                  formControlName="name"
                  autocomplete="name"
                />
              </div>
              <div class="mb-3">
                <label class="form-label" for="c-email">Email</label>
                <input
                  id="c-email"
                  class="form-control"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                />
              </div>
              <div class="mb-3">
                <label class="form-label" for="c-msg">Message</label>
                <textarea
                  id="c-msg"
                  class="form-control"
                  rows="4"
                  formControlName="message"
                ></textarea>
              </div>
              <button class="btn btn-warning fw-semibold" type="submit" [disabled]="form.invalid">
                Send message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ContactPage {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.form.reset();
  }
}
