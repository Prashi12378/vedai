# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build Arguments for Vite (Required at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set Environment Variables for Build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the frontend
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server code
COPY --from=builder /app/server ./server

# Expose the API port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
