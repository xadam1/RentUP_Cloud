# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution + project files first (for layer caching)
COPY RentUP.Cloud.sln .
COPY RentUP.Cloud.Domain/RentUP.Cloud.Domain.csproj           RentUP.Cloud.Domain/
COPY RentUP.Cloud.Application/RentUP.Cloud.Application.csproj RentUP.Cloud.Application/
COPY RentUP.Cloud.Infrastructure/RentUP.Cloud.Infrastructure.csproj RentUP.Cloud.Infrastructure/
COPY RentUP.Cloud.Api/RentUP.Cloud.Api.csproj                 RentUP.Cloud.Api/

# Restore dependencies
RUN dotnet restore RentUP.Cloud.Api/RentUP.Cloud.Api.csproj

# Copy all remaining source files
COPY . .

# Publish the API in Release mode
RUN dotnet publish RentUP.Cloud.Api/RentUP.Cloud.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime (smallest possible image)
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=build /app/publish .

# Expose HTTP port (HTTPS handled by reverse proxy / Fly.io / Railway)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "RentUP.Cloud.Api.dll"]
