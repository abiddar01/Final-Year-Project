-- Backfill realistic engine sizes (cc) for cars missing the value
UPDATE public.cars SET engine_size = 3800 WHERE id = '1321b4de-b790-43d1-9dd3-c69394acb3f1'; -- Porsche 911 Turbo S 3.8L
UPDATE public.cars SET engine_size = 3000 WHERE id = '400b1dd6-7be7-420b-9d95-ec6a26af25b5'; -- GLE 53 AMG 3.0L
UPDATE public.cars SET engine_size = 2000 WHERE id = '2e84ede1-e98a-4f3b-88b1-4d9a3ac708f1'; -- Civic Type R 2.0L
UPDATE public.cars SET engine_size = 3500 WHERE id = '2cc697e0-1335-4441-9e95-2f9e65e48c7f'; -- Land Cruiser 3.5L
UPDATE public.cars SET engine_size = 3000 WHERE id = 'b06bdfb2-0012-498f-98ea-a487ee934879'; -- Range Rover Sport 3.0L diesel
UPDATE public.cars SET engine_size = 2500 WHERE id = '57f0ec0b-87ef-4054-8aa0-8cfe026be55e'; -- Camry Hybrid 2.5L
UPDATE public.cars SET engine_size = 0    WHERE id = '4f604f97-bb25-459b-8426-03ef2fa7abb1'; -- Tesla Model S Plaid (electric)
UPDATE public.cars SET engine_size = 5000 WHERE id = '07ac794d-3142-4f33-9b03-d7a44cb8f1a6'; -- Mustang GT 5.0L
UPDATE public.cars SET engine_size = 3000 WHERE id = 'c3c4e594-0537-49ab-a8a6-fcaa8e49a5c3'; -- S-Class 3.0L
UPDATE public.cars SET engine_size = 3000 WHERE id = '7ff92419-dfef-4233-ab65-ff5f7495e825'; -- BMW 7 Series 3.0L
UPDATE public.cars SET engine_size = 3000 WHERE id = '3b9d62db-5f50-48f3-ba97-d6fedc07887b'; -- Cayenne 3.0L
UPDATE public.cars SET engine_size = 3500 WHERE id = '095eabe5-72bb-467e-8957-f7be87e00143'; -- Lexus LX 600 3.5L
UPDATE public.cars SET engine_size = 2900 WHERE id = '420b2f8f-1c4d-4fd2-9bcb-08abd785d005'; -- Panamera 2.9L
UPDATE public.cars SET engine_size = 3000 WHERE id = '2d264e96-b189-45dd-8074-16a6b6b941cb'; -- M4 Competition 3.0L
UPDATE public.cars SET engine_size = 4000 WHERE id = '54c2025c-b30c-4473-9b1f-65d5358a41f1'; -- G-Class AMG 4.0L
UPDATE public.cars SET engine_size = 3000 WHERE id = '629d0a2b-b847-4aef-a658-db5bcb973c11'; -- Range Rover Autobiography 3.0L
UPDATE public.cars SET engine_size = 4000 WHERE id = '553a5e30-4d6b-4d6c-831b-7bbed1818701'; -- Bentley Continental GT 4.0L
UPDATE public.cars SET engine_size = 4000 WHERE id = 'a739d256-866d-4eec-a53c-b4d60f82337d'; -- Lamborghini Urus 4.0L